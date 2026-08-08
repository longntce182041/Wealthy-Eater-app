const UserProfile = require("../models/UserProfile");
const UserDietary = require("../models/UserDietary");
const ConsultationContract = require("../models/ConsultationContract");
const MealPlan = require("../models/MealPlan");
const MealPlanItem = require("../models/MealPlanItem");
const n8nService = require("./n8n.service");
const User = require("../models/User");
const firebaseConfig = require("../config/firebase");

class MealPlanService {
  async runTemplateMatchPipeline(clientId, nutritionistId) {
    // 1. Verify that an active contract exists to authorize access
    const activeContract = await ConsultationContract.findOne({
      customerId: clientId,
      nutritionistId: nutritionistId,
      status: "ACTIVE",
    });
    if (!activeContract) throw new Error("NO_ACTIVE_CONTRACT");

    // 2. Fetch biometric files and preference maps
    const profile = await UserProfile.findOne({ user_id: clientId });
    if (!profile || !profile.tdee) throw new Error("MISSING_TDEE_PARAMETERS");

    const dietary = await UserDietary.findOne({ user_id: clientId });
    if (
      !dietary ||
      !dietary.diet_preferences ||
      !dietary.diet_preferences.length
    )
      throw new Error("MISSING_DIETARY_PREFERENCES");

    // 3. Dispatch the payload execution parameters to n8n
    const n8nPayload = {
      clientId: clientId,
      tdee: profile.tdee,
      dietaryPreference: dietary.diet_preferences,
      allergies: dietary.allergies || [],
      medicalConditions: dietary.medical_condition_id
        ? [dietary.medical_condition_id]
        : [],
    };

    const result = await n8nService.triggerTemplateMatch(n8nPayload);

    // 4. Evaluate conditional logic outputs
    if (result.cacheHit === false || result.cacheMiss === true) {
      return {
        cacheMiss: true,
        reason: "Template matrix miss fallback to UC-38 execution path.",
      };
    }

    // 5. Instantiate plan records upon a Cache Hit
    const targetStartDate = new Date();
    const targetEndDate = new Date();
    targetEndDate.setDate(targetStartDate.getDate() + 7);

    const newPlan = new MealPlan({
      user_id: clientId,
      nutritionist_id: nutritionistId,
      date: targetStartDate,
      status: "DRAFT",
      created_by: "TEMPLATE_MATCH",
    });
    await newPlan.save();

    const planItemModels = result.matchedTemplate.templateMeals.map(
      (item) =>
        new MealPlanItem({
          planId: newPlan._id,
          dayOfWeek: item.dayOfWeek,
          mealPeriod: item.mealPeriod,
          recipeId: item.recipeId,
          customizedServingsGram: item.customizedServingsGram,
          targetCalories: item.targetCalories,
        }),
    );
    await MealPlanItem.insertMany(planItemModels);

    return {
      cacheHit: true,
      mealPlan: newPlan,
      itemsCount: planItemModels.length,
    };
  }

  async orchestratePlanningPipeline(clientId, nutritionistId) {
    // 1. Precondition Verification: Ensure baseline biological metrics are populated
    const profile = await UserProfile.findOne({ user_id: clientId });
    if (!profile || !profile.tdee) {
      const AppError = require('../utils/AppError');
      throw new AppError(
        "Client baseline profile parameters and calculated TDEE must be set before optimization loops can execute.",
        422,
      );
    }

    const dietary = await UserDietary.findOne({ user_id: clientId });
    if (!dietary) {
      const AppError = require('../utils/AppError');
      throw new AppError(
        "Client preference configurations and allergy records are required.",
        422,
      );
    }

    // 2. Dispatch data constraints payload to the n8n orchestrator webhook pipeline
    const pipelinePayload = {
      clientId: clientId,
      tdee: profile.tdee,
      dietaryPreference: dietary.diet_preferences?.[0] || 'BALANCED',
      allergies: dietary.allergies || [],
      medicalConditions: dietary.medical_condition_id ? [dietary.medical_condition_id] : [],
    };

    const automationResult = await n8nService.triggerTemplateMatch(pipelinePayload);

    // 3. Process execution outcomes — n8n returns the persisted plan meta
    if (!automationResult || !automationResult.meta) {
      const AppError = require('../utils/AppError');
      throw new AppError(
        "The downstream optimization engine returned an invalid data matrix format.",
        502,
      );
    }

    return automationResult.meta;
  }

  async calculateRecipeNutrients(recipeId) {
    const RecipeIngredient = require("../models/RecipeIngredient");
    const Ingredient = require("../models/Ingredient");

    const recipeIngredients = await RecipeIngredient.find({
      recipe_id: recipeId,
    })
      .populate({
        path: "ingredient_id",
        model: "Ingredient",
      })
      .lean();

    let totalWeight = 0;
    let totalCalories = 0;
    let totalProtein = 0;
    let totalFat = 0;
    let totalCarbs = 0;

    for (const ri of recipeIngredients) {
      const ing = ri.ingredient_id;
      if (ing) {
        const qty = ri.base_quantity; // e.g. 150g
        totalWeight += qty;

        // Nutrients are per 1g in database
        totalCalories += (ing.calories_per_unit * qty) / 100;
        totalProtein += ((ing.protein || 0) * qty) / 100;
        totalFat += ((ing.fat || 0) * qty) / 100;
        totalCarbs += ((ing.carbs || 0) * qty) / 100;
      }
    }

    return {
      base_weight: totalWeight || 100, // fallback if no ingredients
      calories: Math.round(totalCalories),
      protein: parseFloat(totalProtein.toFixed(1)),
      fat: parseFloat(totalFat.toFixed(1)),
      carbs: parseFloat(totalCarbs.toFixed(1)),
    };
  }

  async calculateCustomIngredientsNutrients(customIngredients) {
    const Ingredient = require("../models/Ingredient");

    let totalWeight = 0;
    let totalCalories = 0;
    let totalProtein = 0;
    let totalFat = 0;
    let totalCarbs = 0;

    for (const item of customIngredients) {
      const ing = await Ingredient.findById(item.ingredient_id).lean();
      if (ing) {
        const qty = item.amount_gram;
        totalWeight += qty;
        totalCalories += (ing.calories_per_unit * qty) / 100;
        totalProtein += ((ing.protein || 0) * qty) / 100;
        totalFat += ((ing.fat || 0) * qty) / 100;
        totalCarbs += ((ing.carbs || 0) * qty) / 100;
      }
    }

    return {
      base_weight: totalWeight || 100,
      calories: Math.round(totalCalories),
      protein: parseFloat(totalProtein.toFixed(1)),
      fat: parseFloat(totalFat.toFixed(1)),
      carbs: parseFloat(totalCarbs.toFixed(1)),
    };
  }

  async getMyMealPlan(userId) {
    const MealPlan = require("../models/MealPlan");
    const MealPlanItem = require("../models/MealPlanItem");

    // Get the latest meal plan for the user
    const mealPlan = await MealPlan.findOne({ user_id: userId, status: "PUBLISHED" })
      .sort({ date: -1 })
      .lean();

    if (!mealPlan) {
      return null;
    }

    const items = await MealPlanItem.find({ meal_plan_id: mealPlan._id })
      .populate({
        path: "recipe_id",
        model: "Recipe",
      })
      .populate({
        path: "custom_ingredients.ingredient_id",
        model: "Ingredient",
        select: "_id name calories_per_unit protein carbs fat",
      })
      .lean();

    // Assign fallback day_of_week & is_completed
    items.forEach((item, index) => {
      if (item.day_of_week === undefined || item.day_of_week === null) {
        item.day_of_week = Math.floor(index / 3) + 1;
      }
      if (item.is_completed === undefined || item.is_completed === null) {
        item.is_completed = false;
      }
    });

    // Sort items by day_of_week and meal_type order
    const orderMap = { 'breakfast': 1, 'lunch': 2, 'dinner': 3, 'snack': 4 };
    function getMealTypeOrder(mealType) {
      return orderMap[(mealType || '').toLowerCase()] || 99;
    }
    items.sort((a, b) => {
      if (a.day_of_week !== b.day_of_week) {
        return a.day_of_week - b.day_of_week;
      }
      return getMealTypeOrder(a.meal_type) - getMealTypeOrder(b.meal_type);
    });

    // Calculate active_day
    let activeDay = 1;
    const dayNumbers = [...new Set(items.map(item => item.day_of_week))].sort((a, b) => a - b);
    if (dayNumbers.length > 0) {
      const firstUncompletedDay = dayNumbers.find(dayNum => {
        const dayItems = items.filter(item => item.day_of_week === dayNum);
        return dayItems.some(item => !item.is_completed);
      });
      if (firstUncompletedDay) {
        activeDay = firstUncompletedDay;
      } else {
        activeDay = dayNumbers[dayNumbers.length - 1];
      }
    }

    const enrichedItems = [];
    for (const item of items) {
      const recipe = item.recipe_id;
      let nutrients = {
        base_weight: 100,
        calories: 0,
        protein: 0,
        fat: 0,
        carbs: 0,
      };

      let customIngredientsData = null;

      // Priority: if item has a real recipe_id (not AI_GENERATED), treat as recipe-based
      const hasRealRecipe = recipe && recipe._id;
      const isAIGenerated = !hasRealRecipe;

      if (isAIGenerated && item.custom_ingredients && item.custom_ingredients.length > 0) {
        // AI-generated meal: compute nutrients from custom ingredients
        const mappedCustomIngredients = item.custom_ingredients.map(ci => ({
          ingredient_id: ci.ingredient_id?._id || ci.ingredient_id,
          amount_gram: ci.amount_gram,
        }));
        nutrients = await this.calculateCustomIngredientsNutrients(mappedCustomIngredients);

        customIngredientsData = item.custom_ingredients.map(ci => ({
          ingredient: ci.ingredient_id,
          amount_gram: ci.amount_gram,
        }));
      } else if (hasRealRecipe) {
        // Recipe-based meal: compute nutrients from the recipe
        nutrients = await this.calculateRecipeNutrients(recipe._id);
      }

      const customizedGram =
        item.customized_servings_gram || nutrients.base_weight;

      // Scale nutrients based on customized servings gram vs base weight
      const scale = customizedGram / (nutrients.base_weight || 1);

      enrichedItems.push({
        _id: item._id,
        meal_type: item.meal_type,
        day_of_week: item.day_of_week || null,
        is_completed: item.is_completed || false,
        recipe: hasRealRecipe
          ? {
            _id: recipe._id,
            name: recipe.name,
            description: recipe.description,
            image_url: recipe.image_url,
            cooking_time: recipe.cooking_time,
          }
          : null,
        custom_ingredients: customIngredientsData,
        base_weight: nutrients.base_weight,
        customized_servings_gram: customizedGram,
        base_nutrients: {
          calories: nutrients.calories,
          protein: nutrients.protein,
          fat: nutrients.fat,
          carbs: nutrients.carbs,
        },
        customized_nutrients: {
          calories: Math.round(nutrients.calories * scale),
          protein: parseFloat((nutrients.protein * scale).toFixed(1)),
          fat: parseFloat((nutrients.fat * scale).toFixed(1)),
          carbs: parseFloat((nutrients.carbs * scale).toFixed(1)),
        },
      });
    }

    return {
      mealPlanId: mealPlan._id,
      date: mealPlan.date,
      created_by: mealPlan.created_by,
      active_day: activeDay,
      items: enrichedItems,
    };
  }

  async getMealPlanById(planId) {
    const MealPlan = require("../models/MealPlan");
    const MealPlanItem = require("../models/MealPlanItem");

    const mealPlan = await MealPlan.findById(planId).lean();
    if (!mealPlan) return null;

    const items = await MealPlanItem.find({ meal_plan_id: mealPlan._id })
      .populate({
        path: "recipe_id",
        model: "Recipe",
      })
      .populate({
        path: "custom_ingredients.ingredient_id",
        model: "Ingredient",
        select: "_id name calories_per_unit protein carbs fat",
      })
      .lean();

    // Assign fallback day_of_week & is_completed
    items.forEach((item, index) => {
      if (item.day_of_week === undefined || item.day_of_week === null) {
        item.day_of_week = Math.floor(index / 3) + 1;
      }
      if (item.is_completed === undefined || item.is_completed === null) {
        item.is_completed = false;
      }
    });

    // Sort items by day_of_week and meal_type order
    const orderMap = { 'breakfast': 1, 'lunch': 2, 'dinner': 3, 'snack': 4 };
    function getMealTypeOrder(mealType) {
      return orderMap[(mealType || '').toLowerCase()] || 99;
    }
    items.sort((a, b) => {
      if (a.day_of_week !== b.day_of_week) {
        return a.day_of_week - b.day_of_week;
      }
      return getMealTypeOrder(a.meal_type) - getMealTypeOrder(b.meal_type);
    });

    // Calculate active_day
    let activeDay = 1;
    const dayNumbers = [...new Set(items.map(item => item.day_of_week))].sort((a, b) => a - b);
    if (dayNumbers.length > 0) {
      const firstUncompletedDay = dayNumbers.find(dayNum => {
        const dayItems = items.filter(item => item.day_of_week === dayNum);
        return dayItems.some(item => !item.is_completed);
      });
      if (firstUncompletedDay) {
        activeDay = firstUncompletedDay;
      } else {
        activeDay = dayNumbers[dayNumbers.length - 1];
      }
    }

    const enrichedItems = [];
    for (const item of items) {
      const recipe = item.recipe_id;
      let nutrients = {
        base_weight: 100,
        calories: 0,
        protein: 0,
        fat: 0,
        carbs: 0,
      };

      let customIngredientsData = null;

      // Priority: if item has a real recipe_id (not AI_GENERATED), treat as recipe-based
      const hasRealRecipe = recipe && recipe._id;
      const isAIGenerated = !hasRealRecipe;

      if (isAIGenerated && item.custom_ingredients && item.custom_ingredients.length > 0) {
        // AI-generated meal: compute nutrients from custom ingredients
        const mappedCustomIngredients = item.custom_ingredients.map(ci => ({
          ingredient_id: ci.ingredient_id?._id || ci.ingredient_id,
          amount_gram: ci.amount_gram,
        }));
        nutrients = await this.calculateCustomIngredientsNutrients(mappedCustomIngredients);

        customIngredientsData = item.custom_ingredients.map(ci => ({
          ingredient: ci.ingredient_id,
          amount_gram: ci.amount_gram,
        }));
      } else if (hasRealRecipe) {
        // Recipe-based meal: compute nutrients from the recipe
        nutrients = await this.calculateRecipeNutrients(recipe._id);
      }

      const customizedGram =
        item.customized_servings_gram || nutrients.base_weight;

      const scale = customizedGram / (nutrients.base_weight || 1);

      enrichedItems.push({
        _id: item._id,
        meal_type: item.meal_type,
        day_of_week: item.day_of_week || null,
        is_completed: item.is_completed || false,
        recipe: hasRealRecipe
          ? {
            _id: recipe._id,
            name: recipe.name,
            description: recipe.description,
            image_url: recipe.image_url,
            cooking_time: recipe.cooking_time,
          }
          : null,
        custom_ingredients: customIngredientsData,
        base_weight: nutrients.base_weight,
        customized_servings_gram: customizedGram,
        target_calories: item.target_calories || null,
        base_nutrients: {
          calories: nutrients.calories,
          protein: nutrients.protein,
          fat: nutrients.fat,
          carbs: nutrients.carbs,
        },
        customized_nutrients: {
          calories: Math.round(nutrients.calories * scale),
          protein: parseFloat((nutrients.protein * scale).toFixed(1)),
          fat: parseFloat((nutrients.fat * scale).toFixed(1)),
          carbs: parseFloat((nutrients.carbs * scale).toFixed(1)),
        },
      });
    }

    return {
      mealPlanId: mealPlan._id,
      date: mealPlan.date,
      status: mealPlan.status,
      created_by: mealPlan.created_by,
      active_day: activeDay,
      items: enrichedItems,
    };
  }

  async getNutritionistMealPlans(nutritionistId) {
    const MealPlan = require("../models/MealPlan");

    const plans = await MealPlan.find({ nutritionist_id: nutritionistId })
      .populate({
        path: "user_id",
        select: "email name",
      })
      .sort({ date: -1 })
      .lean();

    return plans.map((p) => ({
      mealPlanId: p._id,
      clientEmail: p.user_id ? p.user_id.email : 'Unknown Client',
      status: p.status,
      date: p.date,
      created_by: p.created_by,
    }));
  }

  async updateItemWeight(itemId, weight, ingredients) {
    const MealPlanItem = require("../models/MealPlanItem");

    const item = await MealPlanItem.findById(itemId);
    if (!item) {
      throw new Error("MEAL_PLAN_ITEM_NOT_FOUND");
    }

    if (ingredients && Array.isArray(ingredients)) {
      // Update custom ingredients
      item.custom_ingredients = ingredients.map(ing => ({
        ingredient_id: ing.ingredientId || ing.ingredient_id,
        amount_gram: ing.grams || ing.amount_gram,
      }));

      // Calculate total weight from the ingredients sum
      const totalWeight = item.custom_ingredients.reduce((sum, ci) => sum + ci.amount_gram, 0);
      item.customized_servings_gram = totalWeight || weight || 100;
    } else if (weight !== undefined && weight !== null) {
      // If we only have weight and the item has custom ingredients, scale them
      if (item.custom_ingredients && item.custom_ingredients.length > 0) {
        const currentTotal = item.custom_ingredients.reduce((sum, ci) => sum + ci.amount_gram, 0) || 1;
        const factor = weight / currentTotal;

        for (const ci of item.custom_ingredients) {
          ci.amount_gram = parseFloat((ci.amount_gram * factor).toFixed(1));
        }
      }
      item.customized_servings_gram = weight;
    }

    await item.save();

    // Re-fetch and calculate nutrients
    let nutrients;
    let customIngredientsData = null;

    if (item.custom_ingredients && item.custom_ingredients.length > 0) {
      const mappedCustomIngredients = item.custom_ingredients.map(ci => ({
        ingredient_id: ci.ingredient_id?._id || ci.ingredient_id,
        amount_gram: ci.amount_gram,
      }));
      nutrients = await this.calculateCustomIngredientsNutrients(mappedCustomIngredients);

      // Re-populate custom ingredients
      const populatedItem = await MealPlanItem.findById(itemId)
        .populate({
          path: "custom_ingredients.ingredient_id",
          model: "Ingredient",
          select: "name calories_per_unit protein carbs fat",
        })
        .lean();
      customIngredientsData = populatedItem.custom_ingredients.map(ci => ({
        ingredient: ci.ingredient_id,
        amount_gram: ci.amount_gram,
      }));
    } else {
      const recipeId = item.recipe_id;
      if (recipeId && recipeId !== 'AI_GENERATED') {
        nutrients = await this.calculateRecipeNutrients(recipeId);
      } else {
        nutrients = {
          base_weight: 100,
          calories: 0,
          protein: 0,
          fat: 0,
          carbs: 0,
        };
      }
    }

    const finalWeight = item.customized_servings_gram || nutrients.base_weight;
    const scale = finalWeight / (nutrients.base_weight || 1);

    const Recipe = require("../models/Recipe");
    const recipeId = item.recipe_id;
    const recipe = (recipeId && recipeId !== 'AI_GENERATED') ? await Recipe.findById(recipeId).lean() : null;

    return {
      _id: item._id,
      meal_plan_id: item.meal_plan_id,
      meal_type: item.meal_type,
      day_of_week: item.day_of_week,
      is_completed: item.is_completed ?? false,
      recipe: recipe
        ? {
          _id: recipe._id,
          name: recipe.name,
          description: recipe.description,
          image_url: recipe.image_url,
          cooking_time: recipe.cooking_time,
        }
        : null,
      custom_ingredients: customIngredientsData,
      base_weight: nutrients.base_weight,
      customized_servings_gram: finalWeight,
      base_nutrients: {
        calories: nutrients.calories,
        protein: nutrients.protein,
        fat: nutrients.fat,
        carbs: nutrients.carbs,
      },
      customized_nutrients: {
        calories: Math.round(nutrients.calories * scale),
        protein: parseFloat((nutrients.protein * scale).toFixed(1)),
        fat: parseFloat((nutrients.fat * scale).toFixed(1)),
        carbs: parseFloat((nutrients.carbs * scale).toFixed(1)),
      },
    };
  }

  /**
   * UC-39 — Persist AI-generated meal plan to MongoDB.
   * Called by the n8n workflow after Gemini AI generates meal name & cooking steps.
   *
   * @param {Object} planData - Data from n8n:
   *   clientId, nutritionistId, mealName, description, difficulty,
   *   cookingTimeMinutes, cookingSteps[], allocation[], totals{}
   */
  async saveAIGeneratedPlan(planData) {
    const {
      clientId,
      nutritionistId,
      mealName,
      description,
      difficulty,
      cookingTimeMinutes,
      cookingSteps,
      allocation,
      totals,
    } = planData;

    if (!clientId || !allocation || !Array.isArray(allocation) || allocation.length === 0) {
      const AppError = require('../utils/AppError');
      throw new AppError('Invalid payload: clientId and allocation are required.', 400);
    }

    // 1. Create the MealPlan header document
    const newPlan = new MealPlan({
      user_id: clientId,
      nutritionist_id: nutritionistId || null,
      date: new Date(),
      created_by: 'AI',
      status: 'DRAFT',
    });
    await newPlan.save();

    // 2. Build one MealPlanItem entry representing the entire AI meal
    //    It contains all the allocated ingredients under the custom_ingredients array.
    const customIngredients = allocation.map((component) => ({
      ingredient_id: component.ingredientId,
      amount_gram: component.allocatedGrams,
    }));

    const totalGrams = allocation.reduce((sum, item) => sum + item.allocatedGrams, 0);

    const aiMealItem = new MealPlanItem({
      meal_plan_id: newPlan._id,
      recipe_id: 'AI_GENERATED',
      meal_type: 'LUNCH', // AI defaults to 1 big meal currently
      custom_ingredients: customIngredients,
      target_calories: totals?.calculatedCalories || 0,
      customized_servings_gram: totalGrams,
    });
    await aiMealItem.save();

    // 3. Compose cooking steps as a formatted string for the plan metadata
    const cookingStepText = Array.isArray(cookingSteps)
      ? cookingSteps.map((s) => `${s.stepNumber}. ${s.instruction}`).join('\n')
      : '';

    // 4. Attach AI-generated metadata to the MealPlan document
    newPlan.created_by = `AI|${mealName || 'Optimized Meal'}|${cookingStepText}`;
    await newPlan.save();

    return {
      mealPlanId: newPlan._id,
      totalEnergyEnvelopeKcal: totals?.calculatedCalories || 0,
      allocatedComponentsCount: customIngredients.length,
      mealName: mealName || 'Optimized Meal',
      difficulty: difficulty || 'Medium',
      cookingTimeMinutes: cookingTimeMinutes || 30,
    };
  }

  /**
   * Cập nhật và lưu lại FCM Token của người dùng vào database
   */
  async saveUserFcmToken(userId, fcmToken) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User context not found.");
    }
    user.fcmToken = fcmToken;
    await user.save();
    return user;
  }

  /**
   * UC-53: Cập nhật trạng thái MealPlan và kích bắn thông báo Firebase
   */
  async publishAndNotify(mealPlanId) {
    const mealPlan = await MealPlan.findById(mealPlanId);
    if (!mealPlan) {
      const error = new Error("Meal plan not found");
      error.statusCode = 404;
      throw error;
    }

    if (mealPlan.status === "PUBLISHED") {
      const error = new Error("Meal plan is already published");
      error.statusCode = 400;
      throw error;
    }

    mealPlan.status = "PUBLISHED";
    await mealPlan.save();

    try {
      // Tìm khách hàng thông qua trường customerId đồng bộ với pipeline của dự án
      const targetUserId = mealPlan.customerId || mealPlan.user_id;
      const user = await User.findById(targetUserId);

      if (user && user.fcmToken) {
        const message = {
          notification: {
            title: "🍳 Your new meal plan is ready!",
            body: `Your nutritionist has published your official meal plan. Open the app to view it now!`,
          },
          token: user.fcmToken,
        };

        if (firebaseConfig.messaging) {
          const response = await firebaseConfig.messaging.send(message);
          console.log(
            `[Firebase FCM] Push notification sent successfully! Message ID: ${response}`,
          );
        } else {
          console.log(
            `[Firebase Mock Sandbox] Simulated push notification successfully sent to User: ${targetUserId}`,
          );
        }
      } else {
        console.warn(
          `[Firebase FCM] Skipping notification — no valid fcmToken found for User: ${targetUserId}`,
        );
      }
    } catch (fcmError) {
      console.error(
        "[Firebase FCM Error] Error sending message to device:",
        fcmError.message,
      );
    }

    return mealPlan;
  }

  /**
   * UC-52: Cập nhật bản nháp thực đơn (Nutritionist chỉnh sửa)
   */
  async updateDraftMealPlan(planId, nutritionistId, items) {
    const MealPlan = require("../models/MealPlan");
    const MealPlanItem = require("../models/MealPlanItem");

    const mealPlan = await MealPlan.findById(planId);
    if (!mealPlan) {
      const AppError = require('../utils/AppError');
      throw new AppError("Meal plan not found.", 404);
    }

    if (mealPlan.nutritionist_id?.toString() !== nutritionistId) {
      const AppError = require('../utils/AppError');
      throw new AppError("Unauthorized to edit this meal plan.", 403);
    }

    if (mealPlan.status !== "DRAFT") {
      const AppError = require('../utils/AppError');
      throw new AppError("Only DRAFT meal plans can be edited.", 400);
    }

    let totalCalories = 0;

    for (const updateItem of items) {
      const itemDoc = await MealPlanItem.findOne({
        _id: updateItem.itemId || updateItem._id, // allow both formats
        meal_plan_id: planId,
      });

      if (!itemDoc) continue;

      // Allow editing all entities in MealPlanItem except _id
      const allowedFields = ['meal_plan_id', 'recipe_id', 'meal_type', 'day_of_week', 'customized_servings_gram', 'custom_ingredients', 'target_calories'];
      for (const field of allowedFields) {
        if (updateItem[field] !== undefined) {
          itemDoc[field] = updateItem[field];
        }
      }

      // Keep existing logic for specific nested properties updates (ingredients, recipeId)
      if (updateItem.ingredients && Array.isArray(updateItem.ingredients)) {
        // Update custom ingredients
        itemDoc.custom_ingredients = updateItem.ingredients.map(ing => ({
          ingredient_id: ing.ingredientId,
          amount_gram: ing.grams,
        }));

        // Recalculate target_calories & customized_servings_gram
        const mappedForCalc = itemDoc.custom_ingredients.map(ci => ({
          ingredient_id: ci.ingredient_id,
          amount_gram: ci.amount_gram,
        }));

        const nutrients = await this.calculateCustomIngredientsNutrients(mappedForCalc);
        itemDoc.target_calories = nutrients.calories;
        itemDoc.customized_servings_gram = nutrients.base_weight;
        itemDoc.recipe_id = "AI_GENERATED"; // If it was a recipe, it's now customized

        totalCalories += nutrients.calories;
      } else if (updateItem.recipeId || updateItem.recipe_id) {
        // Swap to a recipe
        const newRecipeId = updateItem.recipeId || updateItem.recipe_id;
        itemDoc.recipe_id = newRecipeId;
        itemDoc.custom_ingredients = [];

        const nutrients = await this.calculateRecipeNutrients(newRecipeId);
        itemDoc.target_calories = nutrients.calories;
        itemDoc.customized_servings_gram = nutrients.base_weight;

        totalCalories += nutrients.calories;
      } else {
        // If neither specific format is used, add to total calories from the itemDoc's updated or existing target_calories
        totalCalories += itemDoc.target_calories || 0;
      }

      await itemDoc.save();
    }

    // Refresh updatedAt timestamp (Mongoose handles this if timestamps: true, else manual fallback)
    mealPlan.updatedAt = new Date();
    await mealPlan.save();

    return {
      mealPlanId: mealPlan._id,
      totalCalories,
      updatedAt: mealPlan.updatedAt
    };
  }

  async logMealPlanItem(userId, itemId, actualWeight, dateStr) {
    const MealPlanItem = require("../models/MealPlanItem");
    const MealPlan = require("../models/MealPlan");
    const CustomerMealLog = require("../models/CustomerMealLog");

    const item = await MealPlanItem.findById(itemId);
    if (!item) {
      throw new Error("MEAL_PLAN_ITEM_NOT_FOUND");
    }

    if (item.is_completed) {
      const error = new Error("MEAL_ALREADY_COMPLETED");
      error.statusCode = 400;
      throw error;
    }

    const weight = actualWeight || item.customized_servings_gram || 100;

    // Calculate nutrients for this item
    let nutrients;
    if (item.custom_ingredients && item.custom_ingredients.length > 0) {
      const mappedCustomIngredients = item.custom_ingredients.map(ci => ({
        ingredient_id: ci.ingredient_id,
        amount_gram: ci.amount_gram,
      }));
      nutrients = await this.calculateCustomIngredientsNutrients(mappedCustomIngredients);
    } else {
      const recipeId = item.recipe_id;
      if (recipeId && recipeId !== 'AI_GENERATED') {
        nutrients = await this.calculateRecipeNutrients(recipeId);
      } else {
        nutrients = {
          base_weight: 100,
          calories: 0,
          protein: 0,
          fat: 0,
          carbs: 0,
        };
      }
    }

    const scale = weight / (nutrients.base_weight || 1);
    const calories = Math.round(nutrients.calories * scale);
    const protein = parseFloat((nutrients.protein * scale).toFixed(1));
    const carbs = parseFloat((nutrients.carbs * scale).toFixed(1));
    const fat = parseFloat((nutrients.fat * scale).toFixed(1));

    // Get custom name if AI generated
    let customName = null;
    if (!item.recipe_id || item.recipe_id === 'AI_GENERATED') {
      const plan = await MealPlan.findById(item.meal_plan_id).lean();
      if (plan && plan.created_by) {
        const parts = plan.created_by.split('|');
        if (parts.length > 1) {
          customName = parts[1];
        }
      }
      if (!customName) {
        customName = 'AI Customized Meal';
      }
    }

    const newLog = new CustomerMealLog({
      user_id: userId,
      recipe_id: item.recipe_id || 'AI_GENERATED',
      actual_weight_gram: weight,
      actual_calories: calories,
      actual_protein: protein,
      actual_carbs: carbs,
      actual_fat: fat,
      custom_name: customName,
      meal_plan_item_id: itemId,
      create_at: dateStr ? new Date(dateStr) : new Date(),
    });

    await newLog.save();

    item.is_completed = true;
    await item.save();

    // ── TRIGGER UC-42 N8N WEBHOOK ──────────────────────────────────────────
    try {
      const ConsultationContract = require("../models/ConsultationContract");
      const activeContract = await ConsultationContract.findOne({
        user_id: userId,
        status: 'active'
      }).lean();

      const n8nService = require('./n8n.service');
      n8nService.triggerAutoAdjustCalories({
        user_id: userId.toString(),
        actual_calories: calories,
        meal_type: item.meal_type,
        meal_log_id: newLog._id.toString(),
        contract_id: activeContract ? activeContract._id.toString() : '',
        logged_at: newLog.create_at.toISOString()
      });
    } catch (err) {
      console.error("❌ Failed to trigger auto-adjust calories webhook:", err);
    }
    // ───────────────────────────────────────────────────────────────────────

    return newLog;
  }

  async getMealLogs(userId, dateStr) {
    const CustomerMealLog = require("../models/CustomerMealLog");

    const query = { user_id: userId };
    if (dateStr) {
      const targetDate = new Date(dateStr);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
      query.create_at = { $gte: startOfDay, $lte: endOfDay };
    }

    const logs = await CustomerMealLog.find(query)
      .populate({
        path: "recipe_id",
        model: "Recipe",
        select: "name description image_url",
      })
      .sort({ create_at: -1 })
      .lean();

    return logs.map(log => {
      const recipe = log.recipe_id;
      return {
        _id: log._id,
        recipe: recipe && recipe._id ? {
          _id: recipe._id,
          name: recipe.name,
          description: recipe.description,
          image_url: recipe.image_url,
        } : null,
        custom_name: log.custom_name,
        actual_weight_gram: log.actual_weight_gram,
        actual_calories: log.actual_calories,
        actual_protein: log.actual_protein || 0,
        actual_carbs: log.actual_carbs || 0,
        actual_fat: log.actual_fat || 0,
        create_at: log.create_at,
        deviation_flag: log.deviation_flag,
        meal_plan_item_id: log.meal_plan_item_id,
      };
    });
  }

  async getDailyMacroReport(userId, dateStr) {
    const CustomerMealLog = require("../models/CustomerMealLog");
    const RecipeNutrition = require("../models/RecipeNutrition");

    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const logs = await CustomerMealLog.find({
      user_id: userId,
      create_at: { $gte: startOfDay, $lte: endOfDay }
    }).lean();

    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    for (const log of logs) {
      totalCalories += log.actual_calories || 0;

      if (log.actual_protein !== undefined && log.actual_protein !== null) {
        totalProtein += log.actual_protein || 0;
        totalCarbs += log.actual_carbs || 0;
        totalFat += log.actual_fat || 0;
      } else {
        // Fallback for legacy database logs
        const nutrition = await RecipeNutrition.findOne({ recipe_id: log.recipe_id }).lean();
        if (nutrition) {
          const scale = (log.actual_weight_gram || 100) / 100;
          totalProtein += (nutrition.protein || 0) * scale;
          totalCarbs += (nutrition.carbs || 0) * scale;
          totalFat += (nutrition.fat || 0) * scale;
        }
      }
    }

    return {
      calories: Math.round(totalCalories),
      protein: parseFloat(totalProtein.toFixed(1)),
      carbs: parseFloat(totalCarbs.toFixed(1)),
      fat: parseFloat(totalFat.toFixed(1))
    };
  }
  async deleteMealLog(userId, logId) {
    const CustomerMealLog = require("../models/CustomerMealLog");
    const MealPlanItem = require("../models/MealPlanItem");

    const log = await CustomerMealLog.findOne({ _id: logId, user_id: userId });
    if (!log) {
      const error = new Error("MEAL_LOG_NOT_FOUND");
      error.statusCode = 404;
      throw error;
    }

    if (log.meal_plan_item_id) {
      const item = await MealPlanItem.findById(log.meal_plan_item_id);
      if (item) {
        item.is_completed = false;
        await item.save();
      }
    }

    await CustomerMealLog.deleteOne({ _id: logId });
    return { success: true };
  }

  async updateMealLog(userId, logId, actualWeight, dateStr) {
    const CustomerMealLog = require("../models/CustomerMealLog");

    const log = await CustomerMealLog.findOne({ _id: logId, user_id: userId });
    if (!log) {
      const error = new Error("MEAL_LOG_NOT_FOUND");
      error.statusCode = 404;
      throw error;
    }

    const oldWeight = log.actual_weight_gram || 1;
    const newWeight = actualWeight;
    const factor = newWeight / oldWeight;

    log.actual_weight_gram = newWeight;
    log.actual_calories = Math.round(log.actual_calories * factor);
    log.actual_protein = parseFloat((log.actual_protein * factor).toFixed(1));
    log.actual_carbs = parseFloat((log.actual_carbs * factor).toFixed(1));
    log.actual_fat = parseFloat((log.actual_fat * factor).toFixed(1));

    if (dateStr) {
      log.create_at = new Date(dateStr);
    }

    await log.save();
    return log;
  }

  /**
   * Save a recipe-based weekly meal plan.
   * Creates 1 MealPlan + N MealPlanItem records (one per recipe assignment).
   *
   * @param {Object} planData
   * @param {string} planData.clientId
   * @param {string} planData.nutritionistId
   * @param {Array} planData.assignments - from FastAPI recipe solver
   * @param {Array} planData.dailySummaries - daily nutrition totals
   */
  async saveRecipeBasedPlan(planData) {
    const { clientId, nutritionistId, assignments, dailySummaries } = planData;

    if (!clientId || !assignments || !Array.isArray(assignments) || assignments.length === 0) {
      const AppError = require('../utils/AppError');
      throw new AppError('Invalid payload: clientId and assignments are required.', 400);
    }

    const RecipeIngredient = require('../models/RecipeIngredient');

    // 1. Create the MealPlan header document
    const newPlan = new MealPlan({
      user_id: clientId,
      nutritionist_id: nutritionistId || null,
      date: new Date(),
      created_by: 'RECIPE_BASED',
      status: 'DRAFT',
    });
    await newPlan.save();

    // 2. Create MealPlanItem entries — one per recipe assignment
    //    Scale RecipeIngredient quantities by portionScale and save as custom_ingredients
    //    so the mobile app can display ingredient breakdown and compute nutrition on the fly.
    const planItems = [];

    for (const assignment of assignments) {
      // Fetch base recipe ingredients and scale them by portionScale
      const recipeIngredients = await RecipeIngredient.find({
        recipe_id: assignment.recipeId,
      }).lean();

      const scaledIngredients = recipeIngredients.map(ri => ({
        ingredient_id: ri.ingredient_id,
        amount_gram: parseFloat(((ri.base_quantity || 0) * assignment.portionScale).toFixed(1)),
      }));

      planItems.push(new MealPlanItem({
        meal_plan_id: newPlan._id,
        recipe_id: assignment.recipeId,
        meal_type: assignment.mealType,
        day_of_week: assignment.dayOfWeek,
        customized_servings_gram: Math.round(assignment.scaledWeight),
        target_calories: Math.round(assignment.scaledCalories),
        // Persist scaled ingredients so the app can compute nutrition without re-querying
        custom_ingredients: scaledIngredients,
      }));
    }

    await MealPlanItem.insertMany(planItems);

    // 3. Calculate overall plan totals
    const totalCalories = dailySummaries
      ? dailySummaries.reduce((sum, d) => sum + (d.totalCalories || 0), 0)
      : assignments.reduce((sum, a) => sum + (a.scaledCalories || 0), 0);

    return {
      mealPlanId: newPlan._id,
      totalItems: planItems.length,
      totalWeeklyCalories: Math.round(totalCalories),
      dailySummaries: dailySummaries || [],
      createdBy: 'RECIPE_BASED',
    };
  }

  async scanMealImage(file) {
    let scanResult = await n8nService.scanMealImage(file);

    // Normalize array or nested payload if returned from n8n
    if (Array.isArray(scanResult) && scanResult.length > 0) {
      scanResult = scanResult[0];
    }
    if (scanResult && typeof scanResult === 'object' && scanResult.data && !scanResult.meal_name) {
      scanResult = scanResult.data;
    }

    try {
      const Recipe = require('../models/Recipe');
      const RecipeNutrition = require('../models/RecipeNutrition');
      const RecipeIngredient = require('../models/RecipeIngredient');
      const Ingredient = require('../models/Ingredient');

      if (scanResult && scanResult.meal_name) {
        const matchedRecipe = await Recipe.findOne({
          name: { $regex: new RegExp(`^${scanResult.meal_name.trim()}$`, 'i') }
        }).lean();

        if (matchedRecipe) {
          const nutrition = await RecipeNutrition.findOne({ recipe_id: matchedRecipe._id }).lean();
          const recipeIngredients = await RecipeIngredient.find({ recipe_id: matchedRecipe._id }).lean();

          const ingredientsList = [];
          for (const ring of recipeIngredients) {
            const ingDetails = await Ingredient.findById(ring.ingredient_id).lean();
            ingredientsList.push({
              name: ingDetails ? ingDetails.name : "Ingredient",
              estimated_amount: ring.quantity,
              estimated_unit: ring.unit || (ingDetails ? ingDetails.unit : "g"),
              nutrition: {
                kcal: ring.calories || 0,
                protein: ring.protein || 0,
                carbs: ring.carbs || 0,
                fats: ring.fat || 0
              }
            });
          }

          return {
            meal_name: matchedRecipe.name,
            recipe_id: matchedRecipe._id,
            image_url: matchedRecipe.image_url || scanResult.image_url,
            // Strict confidence score capped at 0.80 for 2D matched recipe templates
            confidence: 0.80,
            ingredients: ingredientsList.length > 0 ? ingredientsList : (scanResult.ingredients || []),
            totals: {
              kcal: nutrition ? nutrition.calories : (scanResult.totals?.kcal || 0),
              protein: nutrition ? nutrition.protein : (scanResult.totals?.protein || 0),
              carbs: nutrition ? nutrition.carbs : (scanResult.totals?.carbs || 0),
              fats: nutrition ? nutrition.fat : (scanResult.totals?.fats || 0)
            },
            matched_in_system: true,
            note: "⚠️ Reference Warning: AI matched this dish with system database recipes, but portion estimation from 2D camera images carries visual margin of error. Please check and adjust actual portion weight (g) manually."
          };
        }
      }
    } catch (err) {
      console.warn('⚠️ [MealPlanService] Recipe lookup failed during scan meal:', err.message);
    }

    // Strict confidence cap for raw 2D visual AI scan (max 0.65)
    const rawConfidence = parseFloat(scanResult?.confidence);
    const strictConfidence = Math.min(0.65, Math.max(0.30, isNaN(rawConfidence) ? 0.55 : rawConfidence));

    return {
      ...(scanResult || {}),
      confidence: strictConfidence,
      matched_in_system: false,
      note: scanResult?.note || "⚠️ Reference Warning: AI analysis from 2D camera images estimates ingredient amounts based strictly on visual appearance. Please manually check and adjust actual portion weight (g) before logging."
    };
    }

    return {
      ...scanResult,
      matched_in_system: false,
      note: ""
    };
  }

  async logCustomRecipe(userId, recipeId, actualWeight, dateStr) {
    const CustomerMealLog = require("../models/CustomerMealLog");
    const Recipe = require("../models/Recipe");

    const recipe = await Recipe.findById(recipeId);
    if (!recipe) {
      throw new Error("RECIPE_NOT_FOUND");
    }

    const nutrients = await this.calculateRecipeNutrients(recipeId);
    const weight = actualWeight || nutrients.base_weight || 100;
    const scale = weight / (nutrients.base_weight || 1);

    const calories = Math.round(nutrients.calories * scale);
    const protein = parseFloat((nutrients.protein * scale).toFixed(1));
    const carbs = parseFloat((nutrients.carbs * scale).toFixed(1));
    const fat = parseFloat((nutrients.fat * scale).toFixed(1));

    const newLog = new CustomerMealLog({
      user_id: userId,
      recipe_id: recipeId,
      actual_weight_gram: weight,
      actual_calories: calories,
      actual_protein: protein,
      actual_carbs: carbs,
      actual_fat: fat,
      custom_name: recipe.name,
      meal_plan_item_id: null,
      create_at: dateStr ? new Date(dateStr) : new Date(),
    });

    await newLog.save();
    return newLog;
  }

  async deleteMealPlan(planId, nutritionistId) {
    const MealPlan = require('../models/MealPlan');
    const MealPlanItem = require('../models/MealPlanItem');

    const query = { _id: planId };
    if (nutritionistId) {
      query.nutritionist_id = nutritionistId;
    }

    const plan = await MealPlan.findOne(query);
    if (!plan) {
      throw new Error('Meal plan not found or access denied');
    }

    await MealPlanItem.deleteMany({ meal_plan_id: planId });
    await MealPlan.deleteOne({ _id: planId });

    return { message: 'Meal plan deleted successfully' };
>>>>>>> develop
  }
}

module.exports = new MealPlanService();
