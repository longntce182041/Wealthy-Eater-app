const express = require("express");
const router = express.Router();
const mealPlanController = require("../controllers/mealPlan.controller");
const {
  verifyToken,
  protect,
  nutritionistOnly,
} = require("../middlewares/authMiddleware");

// Nutritionist template matching
router.post(
  "/nutritionist/clients/:clientId/meal-plans/match-template",
  verifyToken,
  nutritionistOnly,
  mealPlanController.matchTemplateEndpoint,
);
router.post(
  "/generate",
  verifyToken,
  nutritionistOnly,
  mealPlanController.triggerMealGenerationPipeline,
);

// UC-39: Receive AI-generated meal plan from n8n (internal, no JWT — secured by X-INTERNAL-SECRET)
router.post("/from-ai", mealPlanController.receiveAIPlanEndpoint);

// Get all meal plans created by the logged-in nutritionist
router.get(
  "/nutritionist/plans",
  verifyToken,
  nutritionistOnly,
  mealPlanController.getNutritionistMealPlansEndpoint
);

// Client meal plan management
router.get("/my-plan", protect, mealPlanController.getMyMealPlanEndpoint);
router.put(
  "/items/:itemId/weight",
  protect,
  mealPlanController.updateItemWeightEndpoint,
);

// UC-53: API chuyển trạng thái thực đơn từ DRAFT sang PUBLISHED và bắn thông báo Firebase
router.patch("/:id/publish", mealPlanController.publishMealPlan);

// UC-52: Get and Update Draft Meal Plan
router.get(
  "/:planId/draft",
  verifyToken,
  nutritionistOnly,
  mealPlanController.getMealPlanByIdEndpoint
);

router.put(
  "/:planId/draft",
  verifyToken,
  nutritionistOnly,
  mealPlanController.updateDraftPlanEndpoint
);

//BỔ SUNG: API nhận đồng bộ FCM Token thiết bị lên máy chủ
router.put(
  "/users/fcm-token",
  protect,
  mealPlanController.updateFcmTokenEndpoint,
);

module.exports = router;
