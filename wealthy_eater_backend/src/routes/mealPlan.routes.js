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
  "/meal-plans/generate",
  verifyToken,
  nutritionistOnly,
  mealPlanController.triggerMealGenerationPipeline,
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

//BỔ SUNG: API nhận đồng bộ FCM Token thiết bị lên máy chủ
router.put(
  "/users/fcm-token",
  protect,
  mealPlanController.updateFcmTokenEndpoint,
);

module.exports = router;
