const express = require('express');
const router = express.Router();

// ============================================================================
// 1. IMPORT ROUTE FILES (Alphabetical order to minimize Git conflicts)
// ============================================================================
const adminRecipeRoute = require('./admin.recipe.routes');
const adminUserRoute = require('./admin.user.routes');
const authRoute = require('./auth.route');
const ingredientRoute = require('./ingredient.management.routes');
const micronutrientRoute = require('./micronutrient.management.routes');
const notificationRoute = require('./user.notification.routes');
const nutritionistRoute = require('./nutritionist.routes');
const profileRoute = require('./profile.route');
const shoppingListRoute = require('./shopping_list.route');
const userRecipeRoute = require('./user.recipe.route');

// ============================================================================
// 2. MAPPING API ENDPOINTS (Grouped logically to minimize Git conflicts)
// ============================================================================

// ─── AUTH & PROFILE ─────────────────────────────────────────────────────────
router.use('/api/auth', authRoute);
router.use('/api/profile', profileRoute);

// ─── ADMIN ROUTES ───────────────────────────────────────────────────────────
router.use('/api/admin', adminUserRoute); // Tuỳ chỉnh lại path '/api/admin/users' nếu cần
router.use('/api/admin/ingredients', ingredientRoute);
router.use('/api/admin/micronutrients', micronutrientRoute);
router.use('/api/admin/recipes', adminRecipeRoute);

// ─── NUTRITIONIST ROUTES ────────────────────────────────────────────────────
router.use('/api/nutritionists', nutritionistRoute);

// ─── USER / CUSTOMER ROUTES ─────────────────────────────────────────────────
router.use('/api/user/notifications', notificationRoute);
router.use('/api/user/recipes', userRecipeRoute);
router.use('/api/user/shopping-list', shoppingListRoute);

module.exports = router;