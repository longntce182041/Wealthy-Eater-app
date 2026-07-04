const express = require("express");
const router = express.Router();
const mealPlanController = require("../controllers/mealPlan.controller");
const {
  verifyToken,
  protect,
  nutritionistOnly,
} = require("../middlewares/authMiddleware");
const { uploadMealImage } = require("../middlewares/imageUpload.middleware");

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
router.post(
  "/generate-recipe-plan",
  verifyToken,
  nutritionistOnly,
  mealPlanController.generateRecipeBasedPlan,
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
router.post("/scan-meal", protect, uploadMealImage, mealPlanController.scanMealImageEndpoint);
router.get("/my-plan", protect, mealPlanController.getMyMealPlanEndpoint);
router.get("/daily-report", protect, mealPlanController.getDailyMacroReportEndpoint);
router.get("/logs", protect, mealPlanController.getMealLogsEndpoint);
router.put("/logs/:logId", protect, mealPlanController.updateMealLogEndpoint);
router.delete("/logs/:logId", protect, mealPlanController.deleteMealLogEndpoint);
router.post(
  "/items/:itemId/log",
  protect,
  mealPlanController.logMealPlanItemEndpoint,
);
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
