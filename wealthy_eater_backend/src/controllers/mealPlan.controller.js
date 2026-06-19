const AppError = require('../utils/AppError');
const mealPlanService = require("../services/mealPlan.service");

const matchTemplateEndpoint = async (req, res) => {
  try {
    const { clientId } = req.params;
    const nutritionistId = req.nutritionistId;

    const output = await mealPlanService.runTemplateMatchPipeline(
      clientId,
      nutritionistId,
    );

    if (output.cacheMiss) {
      // Return specific metadata instructing backend gateway orchestration engines to fork
      return res.status(200).json({
        cacheHit: false,
        cacheMiss: true,
        message:
          "No corresponding menu profiles aligned. Request routing transfer to UC-38 LP Microservice.",
        fallbackContext: output.reason,
      });
    }

    return res.status(201).json({
      cacheHit: true,
      message:
        "Menu template match completed successfully. Draft plan initialized.",
      data: output.mealPlan,
      itemsCount: output.itemsCount,
    });
  } catch (error) {
    if (error.message === "NO_ACTIVE_CONTRACT") {
      return res
        .status(403)
        .json({
          error:
            "Access Denied: No active consulting agreement matches this client context.",
        });
    }
    if (
      error.message === "MISSING_TDEE_PARAMETERS" ||
      error.message === "MISSING_DIETARY_PREFERENCES"
    ) {
      return res
        .status(422)
        .json({
          error:
            "Data Incomplete: Client must finalize biometric data surveys before plan generation.",
        });
    }
    if (error.message === "N8N_TIMEOUT_OR_FAILURE") {
      return res
        .status(504)
        .json({
          error:
            "Gateway Timeout: The background orchestration node is busy. Please try again.",
        });
    }
    return res
      .status(500)
      .json({
        error: "Internal Core Server Failure Block Error.",
        technicalDetails: error.message,
      });
  }
};

const getMyMealPlanEndpoint = async (req, res) => {
  try {
    const userId = req.user.id;
    const plan = await mealPlanService.getMyMealPlan(userId);
    return res.status(200).json({
      success: true,
      data: plan
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

const updateItemWeightEndpoint = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { weight } = req.body;

    if (weight === undefined || isNaN(weight) || weight <= 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid weight value"
      });
    }

    const updatedItem = await mealPlanService.updateItemWeight(itemId, Number(weight));
    return res.status(200).json({
      success: true,
      data: updatedItem
    });
  } catch (error) {
    if (error.message === "MEAL_PLAN_ITEM_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        error: "Meal plan item not found"
      });
    }
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  matchTemplateEndpoint,
  getMyMealPlanEndpoint,
  updateItemWeightEndpoint
};
