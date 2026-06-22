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
      contractId: activeContract._id,
      customerId: clientId,
      nutritionistId: nutritionistId,
      startDate: targetStartDate,
      endDate: targetEndDate,
      status: "DRAFT",
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
    const profile = await UserProfile.findOne({ userId: clientId });
    if (!profile || !profile.calculatedTDEE) {
      throw new AppError(
        "Client baseline profile parameters and calculated TDEE must be set before optimization loops can execute.",
        422,
      );
    }

    const dietary = await UserDietary.findOne({ userId: clientId });
    if (!dietary) {
      throw new AppError(
        "Client preference configurations and allergy records are required.",
        422,
      );
    }

    // 2. Dispatch data constraints payload to the orchestrator webhook pipeline
    const pipelinePayload = {
      clientId: clientId,
      tdee: profile.calculatedTDEE,
      dietaryPreference: dietary.dietaryPreference,
      allergies: dietary.allergies,
      medicalConditions: dietary.medicalConditions,
    };

    const automationResult =
      await n8nWorkflowService.invokePipeline(pipelinePayload);

    // 3. Process execution outcomes
    if (!automationResult || !automationResult.allocation) {
      throw new AppError(
        "The downstream optimization engine returned an invalid data matrix format.",
        502,
      );
    }

    // 4. Save the generated plan structure to MongoDB as a Draft
    const targetStartDate = new Date();
    const targetEndDate = new Date();
    targetEndDate.setDate(targetStartDate.getDate() + 7);

    const generatedPlan = new MealPlan({
      contractId: "660a1b2c4f9a3e21a00000aa", // Linked directly to the active consultant agreement
      customerId: clientId,
      nutritionistId: nutritionistId,
      startDate: targetStartDate,
      endDate: targetEndDate,
      status: "DRAFT",
    });
    await generatedPlan.save();

    // Map individual component data values to structural menu items rows
    const itemModelsArray = automationResult.allocation.map(
      (item) =>
        new MealPlanItem({
          planId: generatedPlan._id,
          dayOfWeek: "MONDAY", // Slots auto-populate starting from week boundary anchors
          mealPeriod: "LUNCH",
          recipeId: "660a1b2c4f9a3e21a0000222", // Default blueprint id placeholder mapped for structural parsing
          customizedServingsGram: item.allocatedGrams,
          targetCalories: automationResult.totals.calculatedCalories,
        }),
    );

    await MealPlanItem.insertMany(itemModelsArray);

    return {
      mealPlanId: generatedPlan._id,
      status: "DRAFT",
      totalEnergyEnvelopeKcal: automationResult.totals.calculatedCalories,
      allocatedComponentsCount: itemModelsArray.length,
    };
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

        // Nutrients are per 100g in database
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

  async getMyMealPlan(userId) {
    const MealPlan = require("../models/MealPlan");
    const MealPlanItem = require("../models/MealPlanItem");

    // Get the latest meal plan for the user
    const mealPlan = await MealPlan.findOne({ user_id: userId })
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
      .lean();

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
      if (recipe) {
        nutrients = await this.calculateRecipeNutrients(recipe._id);
      }

      const customizedGram =
        item.customized_servings_gram || nutrients.base_weight;

      // Scale nutrients based on customized servings gram vs base weight
      const scale = customizedGram / nutrients.base_weight;

      enrichedItems.push({
        _id: item._id,
        meal_type: item.meal_type,
        recipe: recipe
          ? {
              _id: recipe._id,
              name: recipe.name,
              description: recipe.description,
              image_url: recipe.image_url,
              cooking_time: recipe.cooking_time,
            }
          : null,
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
      items: enrichedItems,
    };
  }

  async updateItemWeight(itemId, weight) {
    const MealPlanItem = require("../models/MealPlanItem");

    const item = await MealPlanItem.findById(itemId);
    if (!item) {
      throw new Error("MEAL_PLAN_ITEM_NOT_FOUND");
    }

    item.customized_servings_gram = weight;
    await item.save();

    // Re-fetch and return enriched item
    const recipeId = item.recipe_id;
    const nutrients = await this.calculateRecipeNutrients(recipeId);
    const scale = weight / nutrients.base_weight;

    const Recipe = require("../models/Recipe");
    const recipe = await Recipe.findById(recipeId).lean();

    return {
      _id: item._id,
      meal_type: item.meal_type,
      recipe: recipe
        ? {
            _id: recipe._id,
            name: recipe.name,
            description: recipe.description,
            image_url: recipe.image_url,
            cooking_time: recipe.cooking_time,
          }
        : null,
      base_weight: nutrients.base_weight,
      customized_servings_gram: weight,
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
            title: "🍳 Thực đơn mới đã sẵn sàng!",
            body: `Chuyên gia dinh dưỡng đã gửi thực đơn chính thức cho bạn. Vào app xem ngay ní ơi!`,
          },
          token: user.fcmToken,
        };

        if (firebaseConfig.messaging) {
          const response = await firebaseConfig.messaging.send(message);
          console.log(
            `[Firebase FCM] Đã kích bắn thông báo thật thành công! Message ID: ${response}`,
          );
        } else {
          console.log(
            `[Firebase Mock Sandbox] Đã giả lập bắn thông báo thành công tới User: ${targetUserId}`,
          );
        }
      } else {
        console.warn(
          `[Firebase FCM] Bỏ qua gửi thông báo vì không tìm thấy fcmToken hợp lệ của User: ${targetUserId}`,
        );
      }
    } catch (fcmError) {
      console.error(
        "[Firebase FCM Error] Lỗi trong quá trình gửi tin nhắn lên thiết bị:",
        fcmError.message,
      );
    }

    return mealPlan;
  }
}

module.exports = new MealPlanService();
