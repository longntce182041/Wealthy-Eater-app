const AppError = require('../utils/AppError');
const nutritionistService = require('../services/nutritionist.service');

class NutritionistController {
  /**
   * GET /api/nutritionists
   * Fetch all approved nutritionists for the mobile app list
   */
  async getNutritionists(req, res) {
    try {
      const nutritionists = await nutritionistService.getAllApprovedNutritionists();
      
      return res.status(200).json({
        success: true,
        data: nutritionists,
        error: null
      });
    } catch (error) {
      console.error('NutritionistController.getNutritionists Error:', error);
      return next(new AppError('Failed to fetch nutritionists. Please try again later.', 500)); // TODO: pass errorCode INTERNAL_SERVER_ERROR
    }
  }
}

module.exports = new NutritionistController();
