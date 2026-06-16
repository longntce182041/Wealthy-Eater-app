const AppError = require('../utils/AppError');
const nutritionistService = require('../services/nutritionist.service');

class NutritionistController {
  /**
   * BE - UC-45 step 1
   * POST /api/nutritionists/register-account
   * Create customer user account before nutritionist profile configuration
   */
  async createNutritionistUserAccount(req, res) {
    try {
      const result = await nutritionistService.createNutritionistUserAccount(
        req.body,
      );

      return res.status(201).json({
        success: true,
        message: "User account created successfully",
        data: result,
      });
    } catch (error) {
      const statusCode = error.statusCode || error.status || 500;

      return res.status(statusCode).json({
        success: false,
        message: error.message || "Failed to create user account",
      });
    }
  }

  /**
   * BE - UC-45 register expert account
   * POST /api/nutritionists/register
   * Submit nutritionist registration request
   */
  async registerNutritionist(req, res) {
    try {
      const userId = req.user?.id || req.user?.sub || req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized user",
        });
      }

      const result = await nutritionistService.registerNutritionist(
        userId,
        req.body,
        req.file,
      );

      return res.status(201).json({
        success: true,
        message: "Nutritionist registration submitted successfully",
        data: result,
      });
    } catch (error) {
      const statusCode = error.statusCode || error.status || 500;

      return res.status(statusCode).json({
        success: false,
        message: error.message || "Failed to submit nutritionist registration",
      });
    }
  }

  /**
   * GET /api/nutritionists
   * Fetch all approved nutritionists for the mobile app list
   */
  async getNutritionists(req, res) {
    try {
      const nutritionists =
        await nutritionistService.getAllApprovedNutritionists();

      return res.status(200).json({
        success: true,
        data: nutritionists,
        error: null,
      });
    } catch (error) {
      console.error('NutritionistController.getNutritionists Error:', error);
      return next(new AppError('Failed to fetch nutritionists. Please try again later.', 500)); // TODO: pass errorCode INTERNAL_SERVER_ERROR
    }
  }
}

module.exports = new NutritionistController();
