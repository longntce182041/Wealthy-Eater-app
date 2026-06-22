const AppError = require("../utils/AppError");
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
      return res.status(403).json({
        error:
          "Access Denied: No active consulting agreement matches this client context.",
      });
    }
    if (
      error.message === "MISSING_TDEE_PARAMETERS" ||
      error.message === "MISSING_DIETARY_PREFERENCES"
    ) {
      return res.status(422).json({
        error:
          "Data Incomplete: Client must finalize biometric data surveys before plan generation.",
      });
    }
    if (error.message === "N8N_TIMEOUT_OR_FAILURE") {
      return res.status(504).json({
        error:
          "Gateway Timeout: The background orchestration node is busy. Please try again.",
      });
    }
    return res.status(500).json({
      error: "Internal Core Server Failure Block Error.",
      technicalDetails: error.message,
    });
  }
};

const triggerMealGenerationPipeline = async (req, res, next) => {
  try {
    const { clientId } = req.body;
    const nutritionistId = req.user.id; // Extrated dynamically from the verified JWT payload

    if (!clientId) {
      throw new AppError(
        "The payload attribute parameter clientId is required.",
        400,
      );
    }

    const planSummary = await mealPlanService.orchestratePlanningPipeline(
      clientId,
      nutritionistId,
    );

    return res.status(201).json({
      status: "SUCCESS_PIPELINE_RESOLVED",
      message:
        "Draft plan successfully generated and stored by the automation workflow engine.",
      meta: planSummary,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { matchTemplateEndpoint, triggerMealGenerationPipeline };
