const AppError = require('../utils/AppError');
const mealPlanService = require('../services/mealPlan.service');
const geminiService = require('../services/gemini.service');
const { getUserMedicalCondition } = require('../utils/medicalCondition.helper');
const { filterEligibleRecipes } = require('../utils/recipeFilter.helper');
const redisHelper = require('../utils/redisClient');
const { randomUUID: uuidv4 } = require('crypto');

// ── UC-38: Nutritionist template match (legacy) ──────────────────────────────
const matchTemplateEndpoint = async (req, res) => {
  try {
    const { clientId } = req.params;
    const nutritionistId = req.user?.id;

    const output = await mealPlanService.runTemplateMatchPipeline(clientId, nutritionistId);

    if (output.cacheMiss) {
      return res.status(200).json({
        cacheHit: false,
        cacheMiss: true,
        message: 'No corresponding menu profiles aligned. Request routing transfer to UC-38 LP Microservice.',
        fallbackContext: output.reason,
      });
    }

    return res.status(201).json({
      cacheHit: true,
      message: 'Menu template match completed successfully. Draft plan initialized.',
      data: output.mealPlan,
      itemsCount: output.itemsCount,
    });
  } catch (error) {
    if (error.message === 'NO_ACTIVE_CONTRACT') {
      return res.status(403).json({ error: 'Access Denied: No active consulting agreement.' });
    }
    if (error.message === 'MISSING_TDEE_PARAMETERS' || error.message === 'MISSING_DIETARY_PREFERENCES') {
      return res.status(422).json({ error: 'Data Incomplete: Client must finalize biometric data.' });
    }
    if (error.message === 'N8N_TIMEOUT_OR_FAILURE') {
      return res.status(504).json({ error: 'Gateway Timeout: The background orchestration node is busy.' });
    }
    return res.status(500).json({ error: 'Internal Core Server Failure.', technicalDetails: error.message });
  }
};

// ── Get My Meal Plan (Customer) ───────────────────────────────────────────────
const getMyMealPlanEndpoint = async (req, res) => {
  try {
    const userId = req.user.sub || req.user.id;
    const plan = await mealPlanService.getMyMealPlan(userId);
    return res.status(200).json({ success: true, data: plan });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ── Update Item Weight ────────────────────────────────────────────────────────
const updateItemWeightEndpoint = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { weight, ingredients } = req.body;

    if (ingredients === undefined && (weight === undefined || isNaN(weight) || weight <= 0)) {
      return res.status(400).json({ success: false, error: 'Invalid weight or ingredients value' });
    }

    const updatedItem = await mealPlanService.updateItemWeight(
      itemId,
      weight !== undefined ? Number(weight) : undefined,
      ingredients
    );
    return res.status(200).json({ success: true, data: updatedItem });
  } catch (error) {
    if (error.message === 'MEAL_PLAN_ITEM_NOT_FOUND') {
      return res.status(404).json({ success: false, error: 'Meal plan item not found' });
    }
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ── UC-53: Publish Meal Plan + FCM Notification ──────────────────────────────
exports.publishMealPlan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatedMealPlan = await mealPlanService.publishAndNotify(id);
    return res.status(200).json({
      success: true,
      message: 'Meal plan published successfully and notification pipeline processed.',
      data: updatedMealPlan,
    });
  } catch (error) {
    console.error('Error in publishMealPlan controller:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal Server Error',
    });
  }
};

// ── FCM Token Sync ────────────────────────────────────────────────────────────
const updateFcmTokenEndpoint = async (req, res) => {
  try {
    const userId = req.user.sub || req.user.id;
    const { fcmToken } = req.body;

    if (!fcmToken) {
      return res.status(400).json({ success: false, error: 'Missing fcmToken field in request body.' });
    }

    await mealPlanService.saveUserFcmToken(userId, fcmToken);
    return res.status(200).json({
      success: true,
      message: 'User device FCM token synchronized and saved successfully.',
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ── UC-39: Generate AI Meal Plan (Flutter → Node.js → FastAPI → Gemini → MongoDB) ──
const triggerMealGenerationPipeline = async (req, res, next) => {
  try {
    const { clientId } = req.body;
    const nutritionistId = req.user?.id || null; // Extracted from verified JWT by verifyToken middleware

    if (!clientId) {
      return res.status(400).json({
        success: false,
        error: { message: 'clientId is required.' },
      });
    }

    const UserProfile = require('../models/UserProfile');
    const UserDietary = require('../models/UserDietary');
    const Ingredient = require('../models/Ingredient');

    // 1. Fetch client biometric profile
    const profile = await UserProfile.findOne({ user_id: clientId }).lean();
    if (!profile || !profile.tdee) {
      return res.status(422).json({
        success: false,
        error: { message: 'Client has not completed their biometric profile (TDEE missing).' },
      });
    }

    // 2. Fetch client dietary preferences
    const dietary = await UserDietary.findOne({ user_id: clientId }).lean();
    const dietType = dietary?.diet_preferences?.[0] || 'BALANCED';
    const allergies = dietary?.allergies || [];

    // 3. Load all eligible ingredients (exclude allergens)
    const allIngredients = await Ingredient.find({
      calories_per_unit: { $gt: 0 },
      ...(allergies.length > 0 ? { _id: { $nin: allergies } } : {}),
    }).lean();

    if (allIngredients.length === 0) {
      return res.status(422).json({
        success: false,
        error: { message: 'No eligible ingredients found in the database.' },
      });
    }

    const availableIngredients = allIngredients.map(ing => ({
      id: ing._id.toString(),
      name: ing.name,
      calories: ing.calories_per_unit,
      protein: ing.protein ?? 0,
      carbs: ing.carbs ?? 0,
      fat: ing.fat ?? 0,
      allergenTags: [],
      minLimitGram: 0,
      maxLimitGram: 350,
    }));

    // 4. Call FastAPI LP solver at the correct endpoint with required auth header
    const fastApiUrl = process.env.FASTAPI_URL || 'http://localhost:8000';
    const internalSecret = process.env.N8N_INTERNAL_SECRET || '9a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a';

    const lpResponse = await fetch(`${fastApiUrl}/api/v1/ai/compute-diet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-INTERNAL-SECRET': internalSecret,
      },
      body: JSON.stringify({
        targetCalories: profile.tdee,
        targetProtein: 140,
        targetCarbs: 200,
        targetFat: 65,
        allergiesExclusions: [],
        dietType,
        minVarietyItems: 0,
        maxVarietyItems: null,
        activationGramThreshold: 1.0,
        availableIngredients,
      }),
    });

    if (!lpResponse.ok) {
      const errText = await lpResponse.text();
      console.error('[LP Solver] Error response:', lpResponse.status, errText);
      return res.status(502).json({
        success: false,
        error: { message: `LP solver returned an error: ${lpResponse.status}` },
      });
    }

    const lpResult = await lpResponse.json();
    const allocation = lpResult.allocation || [];
    const totals = lpResult.totals || {};

    if (allocation.length === 0) {
      return res.status(422).json({
        success: false,
        error: { message: 'LP solver returned an empty allocation. Check ingredient data.' },
      });
    }

    // 5. Call Gemini AI to generate meal name + cooking steps
    const ingredientSummary = allocation
      .map(a => `${Math.round(a.allocatedGrams)}g ${a.ingredientName}`)
      .join(', ');

    const aiMealData = await geminiService.generateMealPlan({
      ingredientSummary,
      dietType,
      targetCalories: Math.round(totals.calculatedCalories || profile.tdee),
      targetProtein: Math.round(totals.calculatedProtein || 0),
      targetCarbs: Math.round(totals.calculatedCarbs || 0),
      targetFat: Math.round(totals.calculatedFat || 0),
    });

    // 6. Persist MealPlan + MealPlanItems to MongoDB
    const result = await mealPlanService.saveAIGeneratedPlan({
      clientId,
      mealName: aiMealData.mealName,
      description: aiMealData.description,
      difficulty: aiMealData.difficulty,
      cookingTimeMinutes: aiMealData.cookingTimeMinutes,
      cookingSteps: aiMealData.cookingSteps,
      allocation,
      totals,
    });

    return res.status(201).json({
      success: true,
      status: 'SUCCESS_PIPELINE_RESOLVED',
      message: 'AI meal plan generated and saved successfully.',
      meta: result,
    });
  } catch (error) {
    next(error);
  }
};

// ── UC-39: Receive AI Plan from n8n (internal webhook, no JWT) ───────────────
const receiveAIPlanEndpoint = async (req, res, next) => {
  try {
    const internalSecret = req.headers['x-internal-secret'];
    if (internalSecret !== process.env.N8N_INTERNAL_SECRET) {
      return res.status(401).json({ error: 'Unauthorized internal call.' });
    }

    const { clientId, dietType, ingredientSummary, allocation, totals } = req.body;

    if (!clientId || !allocation || !Array.isArray(allocation) || allocation.length === 0) {
      return res.status(400).json({ error: 'clientId and allocation[] are required.' });
    }

    // Call Gemini server-side (key stays in backend)
    const aiMealData = await geminiService.generateMealPlan({
      ingredientSummary: ingredientSummary || allocation.map(a => `${Math.round(a.allocatedGrams)}g ${a.ingredientName}`).join(', '),
      dietType: dietType || 'BALANCED',
      targetCalories: Math.round(totals?.calculatedCalories || 0),
      targetProtein: Math.round(totals?.calculatedProtein || 0),
      targetCarbs: Math.round(totals?.calculatedCarbs || 0),
      targetFat: Math.round(totals?.calculatedFat || 0),
    });

    const result = await mealPlanService.saveAIGeneratedPlan({
      clientId,
      mealName: aiMealData.mealName,
      description: aiMealData.description,
      difficulty: aiMealData.difficulty,
      cookingTimeMinutes: aiMealData.cookingTimeMinutes,
      cookingSteps: aiMealData.cookingSteps,
      allocation,
      totals,
    });

    return res.status(201).json({
      status: 'SUCCESS_PIPELINE_RESOLVED',
      message: 'AI-generated meal plan created successfully.',
      meta: result,
    });
  } catch (error) {
    next(error);
  }
};

// ── UC-52: Update Draft Meal Plan ──────────────────────────────────────────────
const updateDraftPlanEndpoint = async (req, res, next) => {
  try {
    const { planId } = req.params;
    const nutritionistId = req.user?.id; // Provided by auth middleware
    const { items } = req.body;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payload: 'items' array is required."
      });
    }

    const result = await mealPlanService.updateDraftMealPlan(planId, nutritionistId, items);

    return res.status(200).json({
      success: true,
      message: "Draft meal plan updated successfully",
      data: result
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

// ── UC-52: Get Specific Meal Plan (Nutritionist) ───────────────────────────────
const getMealPlanByIdEndpoint = async (req, res, next) => {
  try {
    const { planId } = req.params;
    const plan = await mealPlanService.getMealPlanById(planId);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Meal plan not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: plan
    });
  } catch (error) {
    next(error);
  }
};

// ── Get Nutritionist Meal Plans ────────────────────────────────────────────────
const getNutritionistMealPlansEndpoint = async (req, res, next) => {
  try {
    const nutritionistId = req.user?.id;
    const plans = await mealPlanService.getNutritionistMealPlans(nutritionistId);

    return res.status(200).json({
      success: true,
      data: plans
    });
  } catch (error) {
    next(error);
  }
};

// ── Log Meal Plan Item ────────────────────────────────────────────────────────
const logMealPlanItemEndpoint = async (req, res, next) => {
  try {
    const userId = req.user.sub || req.user.id;
    const { itemId } = req.params;
    const { actual_weight_gram, date } = req.body;

    const log = await mealPlanService.logMealPlanItem(userId, itemId, actual_weight_gram, date);
    return res.status(201).json({ success: true, data: log });
  } catch (error) {
    if (error.message === 'MEAL_PLAN_ITEM_NOT_FOUND') {
      return res.status(404).json({ success: false, error: 'Meal plan item not found' });
    }
    if (error.message === 'MEAL_ALREADY_COMPLETED') {
      return res.status(400).json({ success: false, error: 'Meal already completed' });
    }
    next(error);
  }
};

// ── Update Meal Log ───────────────────────────────────────────────────────────
const updateMealLogEndpoint = async (req, res, next) => {
  try {
    const userId = req.user.sub || req.user.id;
    const { logId } = req.params;
    const { actual_weight_gram, date } = req.body;

    if (!actual_weight_gram || isNaN(actual_weight_gram) || actual_weight_gram <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid weight value' });
    }

    const log = await mealPlanService.updateMealLog(userId, logId, Number(actual_weight_gram), date);
    return res.status(200).json({ success: true, data: log });
  } catch (error) {
    if (error.message === 'MEAL_LOG_NOT_FOUND') {
      return res.status(404).json({ success: false, error: 'Meal log not found' });
    }
    next(error);
  }
};

// ── Delete Meal Log ───────────────────────────────────────────────────────────
const deleteMealLogEndpoint = async (req, res, next) => {
  try {
    const userId = req.user.sub || req.user.id;
    const { logId } = req.params;

    const result = await mealPlanService.deleteMealLog(userId, logId);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    if (error.message === 'MEAL_LOG_NOT_FOUND') {
      return res.status(404).json({ success: false, error: 'Meal log not found' });
    }
    next(error);
  }
};

// ── Get Meal Logs ─────────────────────────────────────────────────────────────
const getMealLogsEndpoint = async (req, res, next) => {
  try {
    const userId = req.user.sub || req.user.id;
    const { date } = req.query;

    const logs = await mealPlanService.getMealLogs(userId, date);
    return res.status(200).json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
};

// ── Get Daily Macro Report ───────────────────────────────────────────────────
const getDailyMacroReportEndpoint = async (req, res, next) => {
  try {
    const userId = req.user.sub || req.user.id;
    const { date } = req.query;

    const report = await mealPlanService.getDailyMacroReport(userId, date);
    return res.status(200).json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
};

// ── Generate Recipe-Based Weekly Meal Plan ────────────────────────────────────
/**
 * Business Rules:
 * 1. target_calories = TDEE × multiplier per health_goal
 * 2. Macro targets derived from weight_kg + health_goal
 * 3. Recipes filtered by: allergies, dislike_ingredients, cooking_time, skill_level
 * 4. Passes portion_scale bounds [0.6, 1.8] and max_repeat_per_week to MILP solver
 */

// Mapping health_goal → TDEE multiplier (business rule §2)
const GOAL_CALORIE_MULTIPLIERS = {
  LOSE_WEIGHT:     0.85,
  FAT_LOSS:        0.90,
  MAINTAIN_WEIGHT: 1.00,
  GAIN_WEIGHT:     1.10,
  MUSCLE_GAIN:     1.08,
};

// Cooking skill order for comparison
const SKILL_LEVEL_ORDER = { beginner: 1, intermediate: 2, advanced: 3 };

const generateRecipeBasedPlan = async (req, res, next) => {
  try {
    const { clientId, days = 7, mealsPerDay = 3, maxRepeatPerWeekPerRecipe = 2 } = req.body;
    const nutritionistId = req.user?.id || null;

    if (!clientId) {
      return res.status(400).json({
        success: false,
        error: { message: 'clientId is required.' },
      });
    }

    const UserProfile = require('../models/UserProfile');
    const UserDietary = require('../models/UserDietary');
    const Recipe = require('../models/Recipe');
    const RecipeIngredient = require('../models/RecipeIngredient');

    // 1. Fetch client biometric profile
    const profile = await UserProfile.findOne({ user_id: clientId }).lean();
    if (!profile || !profile.tdee) {
      return res.status(422).json({
        success: false,
        error: { message: 'Client has not completed their biometric profile (TDEE missing).' },
      });
    }

    // 2. Fetch client dietary preferences
    const dietary = await UserDietary.findOne({ user_id: clientId }).lean();

    // ── Business Rule §2: Compute target_calories from TDEE × health_goal multiplier ──
    const healthGoal = profile.health_goal || 'MAINTAIN_WEIGHT';
    const calorieMultiplier = GOAL_CALORIE_MULTIPLIERS[healthGoal] ?? 1.0;
    let targetCalories = Math.round(profile.tdee * calorieMultiplier);

    // ── Business Rule §3: Derive macros from weight_kg + health_goal ──
    const weightKg = profile.weight || 70;
    const isHighProteinGoal = ['LOSE_WEIGHT', 'FAT_LOSS', 'GAIN_WEIGHT', 'MUSCLE_GAIN'].includes(healthGoal);
    let targetProtein = Math.round(weightKg * (isHighProteinGoal ? 2.0 : 1.6));
    let targetFat     = Math.round(weightKg * 0.8);
    let targetCarbs   = Math.max(50, Math.round((targetCalories - targetProtein * 4 - targetFat * 9) / 4));

    // ── Medical Condition: load and apply nutrient_constraints ────────────────
    let medicalCondition = null;
    const medCondId = getUserMedicalCondition(dietary);
    if (medCondId) {
      const MedicalCondition = require('../models/MedicalCondition');
      medicalCondition = await MedicalCondition.findById(medCondId).lean();
      if (medicalCondition?.nutrient_constraints?.carb_ratio_max != null) {
        const carbConstraintG = Math.round(
          (medicalCondition.nutrient_constraints.carb_ratio_max * targetCalories) / 4
        );
        if (carbConstraintG < targetCarbs) {
          console.log(
            `[MedicalConstraint] carb_ratio_max override for "${medicalCondition.name}": ` +
            `${targetCarbs}g → ${carbConstraintG}g (ratio: ${medicalCondition.nutrient_constraints.carb_ratio_max})`
          );
          targetCarbs = carbConstraintG;
        }
      }
    }

    // ── Business Rule §4 & §5: Build exclusion sets from dietary + medical condition ──
    const bannedIngredientIds = new Set([
      ...(dietary?.allergies || []),
      ...(dietary?.dislike_ingredients || []),
    ]);
    const bannedTags = new Set(medicalCondition?.excluded_ingredient_tags || []);
    const availableCookingTimeMin = dietary?.available_cooking_time ?? 9999;
    const userSkillLevel = SKILL_LEVEL_ORDER[dietary?.cooking_skill_level?.toLowerCase()] || 3;

    // 3. Load all published recipes from DB
    const allRecipes = await Recipe.find({ status: { $in: ['published', 'PUBLISHED'] } }).lean();
    const allRecipesWithFallback = allRecipes.length > 0
      ? allRecipes
      : await Recipe.find({}).lean();

    if (allRecipesWithFallback.length === 0) {
      return res.status(422).json({
        success: false,
        error: { message: 'No recipes found in the database.' },
      });
    }

    // 4. Pre-fetch RecipeIngredient + Ingredient for filter
    // Build recipeIngredientMap: recipeId → [{ingredientId, health_tags}]
    const allRecipeIds = allRecipesWithFallback.map(r => r._id);
    const allRecipeIngredients = await RecipeIngredient.find({ recipe_id: { $in: allRecipeIds } })
      .populate({ path: 'ingredient_id', model: 'Ingredient', select: '_id health_tags' })
      .lean();

    const recipeIngredientMap = new Map();
    for (const ri of allRecipeIngredients) {
      const recId = ri.recipe_id?.toString();
      if (!recipeIngredientMap.has(recId)) recipeIngredientMap.set(recId, []);
      const ing = ri.ingredient_id;
      if (ing) {
        recipeIngredientMap.get(recId).push({
          ingredientId: ing._id?.toString(),
          health_tags: ing.health_tags || [],
        });
      }
    }

    // Apply cooking_time and cooking_skill_level filters first (existing logic)
    const timeAndSkillFiltered = [];
    for (const recipe of allRecipesWithFallback) {
      if (recipe.cooking_time && recipe.cooking_time > availableCookingTimeMin) continue;
      const recipeSkill = SKILL_LEVEL_ORDER[recipe.level_cooking?.toLowerCase()] || 1;
      if (recipeSkill > userSkillLevel) continue;
      timeAndSkillFiltered.push(recipe);
    }

    // Apply medical + allergy/dislike filter using pure function
    const { eligibleRecipes: afterMedicalFilter, dataCoverageWarning } = filterEligibleRecipes({
      recipes: timeAndSkillFiltered,
      bannedIngredientIds,
      bannedTags,
      recipeIngredientMap,
    });

    if (dataCoverageWarning) {
      console.warn(
        `[MedicalFilter] data_coverage_warning: User has medical condition "${
          medicalCondition?.name
        }" with excluded_ingredient_tags [${
          [...bannedTags].join(', ')
        }], but NO ingredient in the system has matching health_tags. Filter has no data.`
      );
    }

    // 5. For each eligible recipe, calculate total nutrition
    const availableRecipes = [];
    for (const recipe of afterMedicalFilter) {
      // Calculate nutrition via RecipeIngredient + Ingredient
      const nutrients = await mealPlanService.calculateRecipeNutrients(recipe._id);

      console.log(`[OPTIMIZER CHECK] Recipe: "${recipe.name}" (ID: ${recipe._id}) => Cal: ${nutrients.calories}, P: ${nutrients.protein}, C: ${nutrients.carbs}, F: ${nutrients.fat}`);

      // Skip recipes with 0 calories (incomplete data)
      if (nutrients.calories <= 0) continue;

      availableRecipes.push({
        id: recipe._id.toString(),
        name: recipe.name,
        totalCalories: nutrients.calories,
        totalProtein: nutrients.protein,
        totalCarbs: nutrients.carbs,
        totalFat: nutrients.fat,
        baseWeight: nutrients.base_weight,
      });
    }

    if (availableRecipes.length < mealsPerDay) {
      return res.status(422).json({
        success: false,
        error: {
          message: `Need at least ${mealsPerDay} valid recipes after applying filters (allergies, medical condition, cooking time, skill level), found ${availableRecipes.length}.`
        },
      });
    }

    // 6. Call FastAPI MILP solver
    const fastApiUrl = process.env.FASTAPI_URL || 'http://localhost:8000';
    const internalSecret = process.env.N8N_INTERNAL_SECRET || '9a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a';

    const solverResponse = await fetch(`${fastApiUrl}/api/v1/ai/compute-recipe-plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-INTERNAL-SECRET': internalSecret,
      },
      body: JSON.stringify({
        targetCalories,
        targetProtein,
        targetCarbs,
        targetFat,
        days,
        mealsPerDay,
        mealCalorieSplit: [0.25, 0.40, 0.35],
        allowRepeatSameDay: false,
        maxRepeatPerWeekPerRecipe,
        portionScaleMin: 0.6,
        portionScaleMax: 1.8,
        availableRecipes,
        // Include medical constraints for solver (null = no medical condition)
        medical_constraints: medicalCondition?.nutrient_constraints || null,
      }),
    });

    if (!solverResponse.ok) {
      const errText = await solverResponse.text();
      console.error('[Recipe Solver] Error response:', solverResponse.status, errText);
      return res.status(502).json({
        success: false,
        error: { message: `Recipe solver returned an error: ${solverResponse.status}` },
      });
    }

    const solverResult = await solverResponse.json();
    const assignments = solverResult.assignments || [];
    const dailySummaries = solverResult.dailySummaries || [];

    if (assignments.length === 0) {
      return res.status(422).json({
        success: false,
        error: { message: 'Recipe solver returned no assignments. Check recipe data.' },
      });
    }

    // 7. Save the recipe-based plan to MongoDB (with target_snapshot per item)
    const result = await mealPlanService.saveRecipeBasedPlan({
      clientId,
      nutritionistId,
      assignments,
      dailySummaries,
      // Pass daily targets so saveRecipeBasedPlan can set target_snapshot per item
      dailyTargets: { targetCalories, targetProtein, targetCarbs, targetFat },
      mealCalorieSplit: [0.25, 0.40, 0.35],
    });

    return res.status(201).json({
      success: true,
      status: 'SUCCESS_RECIPE_PLAN_GENERATED',
      message: 'Recipe-based weekly meal plan generated and saved successfully.',
      // data_coverage_warning: surfaces when medical filter has no ingredient tag data
      data_coverage_warning: dataCoverageWarning || false,
      // constraints_relaxed: which medical constraints were dropped to achieve Optimal
      constraints_relaxed: solverResult.constraints_relaxed || [],
      meta: {
        ...result,
        targetSummary: {
          healthGoal,
          tdee: profile.tdee,
          targetCalories,
          targetProtein,
          targetCarbs,
          targetFat,
          medicalCondition: medicalCondition ? {
            id: medicalCondition._id,
            name: medicalCondition.name,
          } : null,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── Meal type calorie split defaults ──────────────────────────────────────────
const DEFAULT_MEAL_CALORIE_SPLIT = { BREAKFAST: 0.25, LUNCH: 0.40, DINNER: 0.35 };

/**
 * Compute per-meal macro targets from a target_snapshot or fallback to ratio.
 */
function _getMealTarget(item, dailyTarget) {
  const snap = item?.target_snapshot;
  if (snap && snap.calories != null) {
    return {
      calories: snap.calories,
      protein: snap.protein,
      carbs: snap.carbs,
      fat: snap.fat,
    };
  }
  // Fallback: use meal_type ratio × daily target
  const mealType = (item?.meal_type || 'LUNCH').toUpperCase();
  const ratio = DEFAULT_MEAL_CALORIE_SPLIT[mealType] ?? 0.40;
  return {
    calories: Math.round((dailyTarget.targetCalories || 2000) * ratio),
    protein: Math.round((dailyTarget.targetProtein || 140) * ratio),
    carbs: Math.round((dailyTarget.targetCarbs || 200) * ratio),
    fat: Math.round((dailyTarget.targetFat || 65) * ratio),
  };
}

// ── UC-Regenerate: Regenerate 1 meal slot using AI ────────────────────────────
const regenerateItemWithAI = async (req, res, next) => {
  try {
    const { planId, itemId } = req.params;
    const rawIds = req.body?.ingredientIds || req.query?.ingredientIds;
    const ingredientIds = Array.isArray(rawIds)
      ? rawIds
      : (typeof rawIds === 'string' ? rawIds.split(',').map(s => s.trim()).filter(Boolean) : null);

    // 1. Load item + verify it belongs to planId
    const MealPlanItem = require('../models/MealPlanItem');
    const MealPlan = require('../models/MealPlan');
    const item = await MealPlanItem.findOne({ _id: itemId, meal_plan_id: planId }).lean();
    if (!item) {
      return res.status(404).json({ success: false, error: 'Meal plan item not found or does not belong to this plan.' });
    }

    // 2. Load plan to get client's user_id
    const plan = await MealPlan.findById(planId).lean();
    if (!plan) {
      return res.status(404).json({ success: false, error: 'Meal plan not found.' });
    }
    if (plan.status !== 'DRAFT') {
      return res.status(400).json({ success: false, error: 'Only DRAFT plans can be regenerated.' });
    }
    const clientId = plan.user_id;

    // 3. Load dietary + medical condition
    const UserDietary = require('../models/UserDietary');
    const dietary = await UserDietary.findOne({ user_id: clientId }).lean();
    let medicalCondition = null;
    const medCondId = getUserMedicalCondition(dietary);
    if (medCondId) {
      const MedicalCondition = require('../models/MedicalCondition');
      medicalCondition = await MedicalCondition.findById(medCondId).lean();
    }

    // 4. Determine per-meal macro target
    // Use target_snapshot if available (saved during plan generation);
    // fallback to default ratio × plan's daily target (stored in plan metadata or estimated)
    const dailyTarget = {
      targetCalories: plan.target_calories || 2000,
      targetProtein: plan.target_protein || 140,
      targetCarbs: plan.target_carbs || 200,
      targetFat: plan.target_fat || 65,
    };
    const mealTarget = _getMealTarget(item, dailyTarget);

    // 5. Build ingredient pool (exclude allergens + medical tags)
    const bannedIngredientIds = new Set([
      ...(dietary?.allergies || []),
      ...(dietary?.dislike_ingredients || []),
    ]);
    const bannedTags = new Set(medicalCondition?.excluded_ingredient_tags || []);

    const Ingredient = require('../models/Ingredient');
    let poolIngredients;
    if (ingredientIds && Array.isArray(ingredientIds) && ingredientIds.length > 0) {
      // Nutritionist specified a pool explicitly
      poolIngredients = await Ingredient.find({ _id: { $in: ingredientIds }, calories_per_unit: { $gt: 0 } }).lean();
    } else {
      poolIngredients = await Ingredient.find({ calories_per_unit: { $gt: 0 } }).lean();
    }

    const { filterEligibleIngredients } = require('../utils/recipeFilter.helper');
    const { eligibleIngredients } = filterEligibleIngredients({
      ingredients: poolIngredients,
      bannedIngredientIds,
      bannedTags,
    });

    if (eligibleIngredients.length === 0) {
      return res.status(422).json({ success: false, error: 'No eligible ingredients found after applying filters.' });
    }

    const availableIngredients = eligibleIngredients.map(ing => ({
      id: ing._id.toString(),
      name: ing.name,
      calories: ing.calories_per_unit,
      protein: ing.protein ?? 0,
      carbs: ing.carbs ?? 0,
      fat: ing.fat ?? 0,
      allergenTags: [],
      minLimitGram: 0,
      maxLimitGram: 350,
    }));

    // 6. Call FastAPI LP solver for this single meal's portion
    const fastApiUrl = process.env.FASTAPI_URL || 'http://localhost:8000';
    const internalSecret = process.env.N8N_INTERNAL_SECRET || '9a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a';

    const lpResponse = await fetch(`${fastApiUrl}/api/v1/ai/compute-diet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-INTERNAL-SECRET': internalSecret },
      body: JSON.stringify({
        targetCalories: mealTarget.calories,
        targetProtein: mealTarget.protein,
        targetCarbs: mealTarget.carbs,
        targetFat: mealTarget.fat,
        allergiesExclusions: [],
        dietType: dietary?.diet_preferences?.[0] || 'BALANCED',
        minVarietyItems: 0,
        maxVarietyItems: null,
        activationGramThreshold: 1.0,
        availableIngredients,
      }),
    });

    if (!lpResponse.ok) {
      const errText = await lpResponse.text();
      return res.status(502).json({ success: false, error: `LP solver error: ${lpResponse.status} — ${errText}` });
    }

    const lpResult = await lpResponse.json();
    const allocation = lpResult.allocation || [];
    const totals = lpResult.totals || {};

    if (allocation.length === 0) {
      return res.status(422).json({ success: false, error: 'LP solver returned empty allocation.' });
    }

    // 7. Call Gemini to generate meal name + steps with medical context
    const ingredientSummary = allocation
      .map(a => `${Math.round(a.allocatedGrams)}g ${a.ingredientName}`)
      .join(', ');

    const aiMealData = await geminiService.generateMealWithMedicalContext({
      ingredientSummary,
      targetCalories: Math.round(totals.calculatedCalories || mealTarget.calories),
      targetProtein: Math.round(totals.calculatedProtein || mealTarget.protein),
      targetCarbs: Math.round(totals.calculatedCarbs || mealTarget.carbs),
      targetFat: Math.round(totals.calculatedFat || mealTarget.fat),
      medicalCondition,
    });

    // 8. Build preview object
    const previewData = {
      dish_name: aiMealData.dish_name,
      description: aiMealData.description,
      difficulty: aiMealData.difficulty,
      cooking_time_minutes: aiMealData.cooking_time_minutes,
      steps: aiMealData.steps,
      warning: aiMealData.warning || null,
      macro: {
        calories: Math.round(totals.calculatedCalories || mealTarget.calories),
        protein: parseFloat((totals.calculatedProtein || mealTarget.protein).toFixed(1)),
        carbs: parseFloat((totals.calculatedCarbs || mealTarget.carbs).toFixed(1)),
        fat: parseFloat((totals.calculatedFat || mealTarget.fat).toFixed(1)),
      },
      allocation, // raw allocation for storing as custom_ingredients
      constraints_relaxed: [], // LP solver for single meal doesn't have relaxation
    };

    // 9. Cache preview in Redis (TTL 15 minutes)
    const previewId = uuidv4();
    const cacheKey = `ai_preview:${previewId}`;
    const cached = await redisHelper.setWithTTL(cacheKey, 900, JSON.stringify(previewData));
    if (!cached) {
      console.warn('[regenerateItemWithAI] Redis unavailable — preview not cached. Client must retry if needed.');
    }

    return res.status(200).json({
      success: true,
      previewId,
      preview: previewData,
    });
  } catch (error) {
    next(error);
  }
};

// ── UC-Regenerate: Apply AI Preview to MealPlanItem ───────────────────────────
const applyAISuggestion = async (req, res, next) => {
  try {
    const { planId, itemId } = req.params;
    const { previewId } = req.body;

    if (!previewId) {
      return res.status(400).json({ success: false, error: 'previewId is required.' });
    }

    // 1. Fetch preview from Redis
    const cacheKey = `ai_preview:${previewId}`;
    const cached = await redisHelper.get(cacheKey);
    if (!cached) {
      return res.status(410).json({
        success: false,
        error: 'Preview has expired or does not exist. Please regenerate.',
        code: 'PREVIEW_EXPIRED',
      });
    }
    const previewData = JSON.parse(cached);

    // 2. Load item and plan (validate ownership + DRAFT status)
    const MealPlanItem = require('../models/MealPlanItem');
    const MealPlan = require('../models/MealPlan');
    const item = await MealPlanItem.findOne({ _id: itemId, meal_plan_id: planId });
    if (!item) {
      return res.status(404).json({ success: false, error: 'Meal plan item not found.' });
    }
    const plan = await MealPlan.findById(planId).lean();
    if (!plan || plan.status !== 'DRAFT') {
      return res.status(400).json({ success: false, error: 'Can only apply suggestions to DRAFT plans.' });
    }
    const clientId = plan.user_id;

    // 3. Server-side re-validate: check preview macro vs medical constraints
    // We do NOT trust client-side data — we re-read constraints from DB.
    const UserDietary = require('../models/UserDietary');
    const dietary = await UserDietary.findOne({ user_id: clientId }).lean();
    let medicalCondition = null;
    const medCondId = getUserMedicalCondition(dietary);
    if (medCondId) {
      const MedicalCondition = require('../models/MedicalCondition');
      medicalCondition = await MedicalCondition.findById(medCondId).lean();
    }

    // Evaluate macro_violation: check per-meal macro against constraint thresholds
    let macroViolation = false;
    const nc = medicalCondition?.nutrient_constraints;
    if (nc && previewData.macro) {
      const pm = previewData.macro;
      // Evaluate based on per-meal carb ratio
      if (nc.carb_ratio_max != null && pm.calories > 0) {
        const actualCarbRatio = (pm.carbs * 4) / pm.calories;
        if (actualCarbRatio > nc.carb_ratio_max + 0.05) { // 5% tolerance
          macroViolation = true;
        }
      }
    }

    // 4. Apply preview to MealPlanItem
    const allocation = previewData.allocation || [];
    item.recipe_id = 'AI_GENERATED';
    item.custom_ingredients = allocation.map(a => ({
      ingredient_id: a.ingredientId,
      amount_gram: a.allocatedGrams,
    }));
    item.target_calories = previewData.macro?.calories || 0;
    item.customized_servings_gram = allocation.reduce((s, a) => s + a.allocatedGrams, 0);
    // Update target_snapshot from the validated preview macro
    item.target_snapshot = {
      calories: previewData.macro?.calories || null,
      protein: previewData.macro?.protein || null,
      carbs: previewData.macro?.carbs || null,
      fat: previewData.macro?.fat || null,
    };
    await item.save();

    // 5. Delete Redis cache after successful apply
    await redisHelper.del(cacheKey);

    // 6. Return updated item with macro_violation flag
    return res.status(200).json({
      success: true,
      message: 'AI suggestion applied successfully.',
      macro_violation: macroViolation,
      data: {
        _id: item._id,
        meal_plan_id: item.meal_plan_id,
        meal_type: item.meal_type,
        day_of_week: item.day_of_week,
        target_snapshot: item.target_snapshot,
        macro: previewData.macro,
        dish_name: previewData.dish_name,
        macro_violation: macroViolation,
      },
    });
  } catch (error) {
    next(error);
  }
};


const scanMealImageEndpoint = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { message: "Missing image file. Please upload a clear photo of your meal plate." },
      });
    }

    const result = await mealPlanService.scanMealImage(req.file);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("⚠️ [Scan Meal Error]:", error.message);
    const friendlyMsg = error.message && !error.message.includes("N8N_") && !error.message.includes("HTTP_")
      ? error.message
      : "No valid meal detected in image. Please take a clear photo of your meal plate and try again.";

    return res.status(400).json({
      success: false,
      error: { message: friendlyMsg },
    });
  }
};

const logCustomRecipeEndpoint = async (req, res, next) => {
  try {
    const userId = req.user.sub || req.user.id;
    const { recipeId, actual_weight_gram, date } = req.body;

    if (!recipeId) {
      return res.status(400).json({
        success: false,
        error: 'recipeId is required',
      });
    }

    const log = await mealPlanService.logCustomRecipe(userId, recipeId, actual_weight_gram, date);
    return res.status(201).json({ success: true, data: log });
  } catch (error) {
    if (error.message === 'RECIPE_NOT_FOUND') {
      return res.status(404).json({ success: false, error: 'Recipe not found' });
    }
    next(error);
  }
};

const deleteMealPlanEndpoint = async (req, res, next) => {
  try {
    const planId = req.params.planId || req.params.id;
    const nutritionistId = req.user?.id || req.user?._id;

    const result = await mealPlanService.deleteMealPlan(planId, nutritionistId);
    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error('Error deleting meal plan:', error);
    return res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to delete meal plan' },
    });
  }
};

module.exports = {
  matchTemplateEndpoint,
  getMyMealPlanEndpoint,
  updateItemWeightEndpoint,
  publishMealPlan: exports.publishMealPlan,
  updateFcmTokenEndpoint,
  triggerMealGenerationPipeline,
  receiveAIPlanEndpoint,
  updateDraftPlanEndpoint,
  getMealPlanByIdEndpoint,
  getNutritionistMealPlansEndpoint,
  logMealPlanItemEndpoint,
  updateMealLogEndpoint,
  deleteMealLogEndpoint,
  getMealLogsEndpoint,
  getDailyMacroReportEndpoint,
  generateRecipeBasedPlan,
  scanMealImageEndpoint,
  logCustomRecipeEndpoint,
  deleteMealPlanEndpoint,
  regenerateItemWithAI,
  applyAISuggestion,
};
