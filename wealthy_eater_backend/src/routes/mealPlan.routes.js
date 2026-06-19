const express = require("express");
const router = express.Router();
const mealPlanController = require("../controllers/mealPlan.controller");
const { protect, nutritionistOnly } = require("../middlewares/authMiddleware");

// Nutritionist template matching
router.post(
  "/nutritionist/clients/:clientId/meal-plans/match-template",
  nutritionistOnly,
  mealPlanController.matchTemplateEndpoint,
);

// Client meal plan management
router.get("/my-plan", protect, mealPlanController.getMyMealPlanEndpoint);
router.put("/items/:itemId/weight", protect, mealPlanController.updateItemWeightEndpoint);

module.exports = router;
