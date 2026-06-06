const express = require('express');
const router = express.Router();

// Import and mount feature routers here
const authRoute          = require('./auth.route');
const recipeRoute        = require('./user.recipe.route');
const ingredientRoute    = require('./ingredient.management.routes');
const shoppingListRoute  = require('./shopping_list.route');

router.use('/api/auth',          authRoute);
router.use('/api/user/recipes',       recipeRoute);
router.use('/api/ingredients',   ingredientRoute);
router.use('/api/user/shopping-list', shoppingListRoute);

module.exports = router;

