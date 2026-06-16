const UserProfile = require("../models/UserProfile");
const UserDietary = require("../models/UserDietary");
const ConsultationContract = require("../models/ConsultationContract");
const MealPlan = require("../models/MealPlan");
const MealPlanItem = require("../models/MealPlanItem");
const n8nService = require("./n8n.service");

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
    const profile = await UserProfile.findOne({ userId: clientId });
    if (!profile || !profile.calculatedTDEE)
      throw new Error("MISSING_TDEE_PARAMETERS");

    const dietary = await UserDietary.findOne({ userId: clientId });
    if (!dietary || !dietary.dietaryPreference)
      throw new Error("MISSING_DIETARY_PREFERENCES");

    // 3. Dispatch the payload execution parameters to n8n
    const n8nPayload = {
      clientId: clientId,
      tdee: profile.calculatedTDEE,
      dietaryPreference: dietary.dietaryPreference,
      allergies: dietary.allergies || [],
      medicalConditions: dietary.medicalConditions || [],
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
}

module.exports = new MealPlanService();
