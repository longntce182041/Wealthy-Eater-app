const express = require('express');
const router = express.Router();

// 1. IMPORT CÁC ROUTE PHÂN HỆ
const authRoute = require('./auth.route');
const userRecipeRoute = require('./user.recipe.route');
const profileRoute = require('./profile.route');
const ingredientRoute = require('./ingredient.management.routes');
const shoppingListRoute = require('./shopping_list.route');
const micronutrientRoute = require('./micronutrient.management.routes');

// 👉 THÊM DÒNG NÀY: Import file route của Admin Recipe
const adminRecipeRoute = require('./admin.recipe.routes'); 

// 2. MAPPING CÁC ENDPOINT API
router.use('/api/auth', authRoute);

// Để an toàn cho cả Mobile và Web, cả 2 endpoint dưới đây đều trỏ về file user.recipe.route.js của bạn
router.use('/api/user/recipes', userRecipeRoute);
router.use('/api/recipes', userRecipeRoute); 

router.use('/api/profile', profileRoute);
router.use('/api/ingredients', ingredientRoute);
router.use('/api/user/shopping-list', shoppingListRoute);
router.use('/api/micronutrients', micronutrientRoute);

// 👉 THÊM DÒNG NÀY: Trỏ endpoint /api/admin/recipes vào file adminRecipeRoute
router.use('/api/admin/recipes', adminRecipeRoute);

module.exports = router;