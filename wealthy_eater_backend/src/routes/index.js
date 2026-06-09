const express = require('express');
const router = express.Router();

// Import and mount feature routers here
const authRoute = require('./auth.route');
const recipeRoute = require('./user.recipe.route');
const ingredientRoute = require('./ingredient.management.routes');
const shoppingListRoute = require('./shopping_list.route');
const micronutrientRoute = require('./micronutrient.management.routes');
const profileRoute = require('./profile.route');
const notificationRoute = require('./user.notification.routes');

router.use('/api/auth', authRoute);
router.use('/api/user/recipes', recipeRoute);
router.use('/api/ingredients', ingredientRoute);
router.use('/api/user/shopping-list', shoppingListRoute);
router.use('/api/micronutrients', micronutrientRoute);
router.use('/api/profile', profileRoute);
router.use('/api/user/notifications', notificationRoute);


module.exports = router;

