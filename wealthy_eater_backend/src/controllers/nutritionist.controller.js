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
      return res.status(500).json({
        success: false,
        data: null,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch nutritionists. Please try again later.'
        }
      });
    }
  }
}

module.exports = new NutritionistController();
