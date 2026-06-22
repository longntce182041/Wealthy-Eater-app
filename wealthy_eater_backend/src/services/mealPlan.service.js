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
}

module.exports = new MealPlanService();
