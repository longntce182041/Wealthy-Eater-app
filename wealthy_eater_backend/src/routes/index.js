const express = require('express');
const router = express.Router();

// Import and mount feature routers here
const authRoute = require('./auth.route');
const recipeRoute = require('./user.recipe.route');
const ingredientRoute = require('./ingredient.management.routes');
const shoppingListRoute = require('./shopping_list.route');
const micronutrientRoute = require('./micronutrient.management.routes');
const adminRecipeRoute = require('./admin.recipe.routes');
const profileRoute = require('./profile.route');

router.use('/api/auth', authRoute);
router.use('/api/user/recipes', recipeRoute);
router.use('/api/ingredients', ingredientRoute);
router.use('/api/user/shopping-list', shoppingListRoute);
router.use('/api/micronutrients', micronutrientRoute);
router.use('/api/admin/recipes', adminRecipeRoute);
router.use('/api/profile', profileRoute);


module.exports = router;

