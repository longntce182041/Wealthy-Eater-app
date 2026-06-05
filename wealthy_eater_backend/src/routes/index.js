const express = require('express');
const router = express.Router();

// Import and mount feature routers here
const authRoute = require('./auth.route');
const recipeRoute = require('./recipe.route');
const profileRoute = require('./profile.route');

router.use('/api/auth', authRoute);
router.use('/api/recipes', recipeRoute);
router.use('/api/profile', profileRoute);

module.exports = router;
