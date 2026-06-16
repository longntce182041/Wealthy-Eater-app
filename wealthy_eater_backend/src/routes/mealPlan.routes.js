const express = require("express");
const router = express.Router();
const mealPlanController = require("../controllers/mealPlan.controller");
const { nutritionistOnly } = require("../middlewares/authMiddleware");

router.post(
  "/nutritionist/clients/:clientId/meal-plans/match-template",
  nutritionistOnly,
  mealPlanController.matchTemplateEndpoint,
);
module.exports = router;
