const express = require('express');
const router = express.Router();
const RecipeController = require('../controllers/recipe.controller');
const { authenticateToken } = require('../middlewares/auth');

router.get('/', authenticateToken, RecipeController.list);
router.get('/:id', authenticateToken, RecipeController.detail);

module.exports = router;