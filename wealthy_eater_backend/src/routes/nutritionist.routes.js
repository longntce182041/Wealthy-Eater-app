const express = require('express');
const router = express.Router();
const nutritionistController = require('../controllers/nutritionist.controller');

// GET /api/nutritionists - Get list of approved nutritionists
router.get('/', nutritionistController.getNutritionists);

module.exports = router;
