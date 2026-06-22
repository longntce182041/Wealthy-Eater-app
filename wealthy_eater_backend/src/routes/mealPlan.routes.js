const express = require("express");
const router = express.Router();
const mealPlanController = require("../controllers/mealPlan.controller");
const {
  verifyToken,
  nutritionistOnly,
} = require("../middlewares/authMiddleware");

router.post(
  "/nutritionist/clients/:clientId/meal-plans/match-template",
  verifyToken,
  nutritionistOnly,
  mealPlanController.matchTemplateEndpoint,
);
router.post(
  "/meal-plans/generate",
  verifyToken,
  nutritionistOnly,
  mealPlanController.triggerMealGenerationPipeline,
);
module.exports = router;
