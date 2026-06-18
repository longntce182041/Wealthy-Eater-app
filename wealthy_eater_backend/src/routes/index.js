const express = require("express");
const router = express.Router();

// ============================================================================
// 1. IMPORT ROUTE FILES (Alphabetical order to minimize Git conflicts)
// ============================================================================
const adminNutritionistRoute = require("./admin.nutritionist.routes"); // 👈 THÊM VÀO ĐÂY (Giữa N và R theo Alphabet)
const adminRecipeRoute = require("./admin.recipe.routes");
const adminUserRoute = require("./admin.user.routes");
const analyticsRoute = require("./analytics.route");
const authRoute = require("./auth.route");
const chatRoute = require("./chat.routes");
const consultationRoute = require("./user.consultation.routes");
const ingredientRoute = require("./ingredient.management.routes");
const mealPlanRoutes = require("./mealPlan.routes");
const micronutrientRoute = require("./micronutrient.management.routes");
const notificationRoute = require("./user.notification.routes");
const nutritionistRoute = require("./nutritionist.routes");
const nutritionistChatRoute = require("./nutritionist.chat.routes");
const profileRoute = require("./profile.route");
const shoppingListRoute = require("./shopping_list.route");
const userRecipeRoute = require("./user.recipe.route");
const webhookRoute = require("./webhook.routes");

// ============================================================================
// 2. MAPPING API ENDPOINTS (Grouped logically to minimize Git conflicts)
// ============================================================================

// ─── AUTH & PROFILE ─────────────────────────────────────────────────────────
router.use("/api/auth", authRoute);
router.use("/api/profile", profileRoute);

// ─── ADMIN ROUTES ───────────────────────────────────────────────────────────
router.use("/api/admin/users", adminUserRoute);
router.use("/api/admin/nutritionists", adminNutritionistRoute); // 👈 THÊM VÀO ĐÂY (Nằm trong cụm Admin)
router.use("/api/admin/ingredients", ingredientRoute);
router.use("/api/admin/micronutrients", micronutrientRoute);
router.use("/api/admin/recipes", adminRecipeRoute);
router.use("/api/admin/analytics", analyticsRoute);
router.use("/api/admin/system-dashboard", systemDashboardRoute);

// ─── NUTRITIONIST ROUTES ────────────────────────────────────────────────────
router.use("/api/nutritionists", nutritionistRoute);
router.use("/api/nutritionist", nutritionistChatRoute);
router.use("/api/meal-plans", mealPlanRoutes);

// ─── USER / CUSTOMER ROUTES ─────────────────────────────────────────────────
router.use("/api/user/consultations", consultationRoute);
router.use("/api/user/notifications", notificationRoute);
router.use("/api/user/recipes", userRecipeRoute);
router.use("/api/user/shopping-list", shoppingListRoute);

// ─── CHAT ROUTES (shared: user + nutritionist) ───────────────────────────────
router.use("/api/chat", chatRoute);

// ─── WEBHOOK ROUTES (unauthenticated, verified via signature) ───────────────
router.use("/api/webhooks", webhookRoute);

module.exports = router;