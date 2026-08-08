const express = require('express');
const router = express.Router();
const UserAiRecipeController = require('../controllers/user.ai_recipe.controller');
const { authenticateToken } = require('../middlewares/auth');
const validateObjectId = require('../middlewares/validateObjectId');

router.use(authenticateToken);

// Create / Save a new AI Recipe
router.post('/', UserAiRecipeController.saveRecipe);

// Get all saved AI recipes for user
router.get('/', UserAiRecipeController.getMyAiRecipes);

// Delete a saved AI recipe
router.delete('/:id', validateObjectId('id'), UserAiRecipeController.deleteAiRecipe);

module.exports = router;
