const AppError = require('../utils/AppError');
const nutritionistService = require('../services/nutritionist.service');

class NutritionistController {
  /**
   * BE - UC-45 step 1
   * POST /api/nutritionists/register-account
   * Create customer user account before nutritionist profile configuration
   */
  async createNutritionistUserAccount(req, res, next) {
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
      return next(new AppError(error.message || "Failed to create user account", statusCode, 'USER_CREATION_FAILED'));
    }
  }

  /**
   * BE - UC-45 register expert account
   * POST /api/nutritionists/register
   * Submit nutritionist registration request
   */
  async registerNutritionist(req, res, next) {
    try {
      const userId = req.user?.id || req.user?.sub || req.user?.userId;

      if (!userId) {
        return next(new AppError("Unauthorized user", 401, 'UNAUTHORIZED'));
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
      return next(new AppError(error.message || "Failed to submit nutritionist registration", statusCode, 'REGISTRATION_FAILED'));
    }
  }

  /**
   * GET /api/nutritionists
   * Fetch all approved nutritionists for the mobile app list
   */
  async getNutritionists(req, res, next) {
    try {
      const nutritionists = await nutritionistService.getAllApprovedNutritionists();

      return res.status(200).json({
        success: true,
        data: nutritionists,
        error: null,
      });
    } catch (error) {
      console.error('NutritionistController.getNutritionists Error:', error);
      return next(
        new AppError(
          'Failed to fetch nutritionists. Please try again later.',
          500,
          'INTERNAL_SERVER_ERROR',
        ),
      );
    }
  }

  /**
   * GET /api/nutritionists/meal-plan-requests
   * Get pending requests for the authenticated nutritionist (UC-13)
   */
  async getMealPlanRequests(req, res, next) {
    try {
      const userId = req.user?.id || req.user?.sub || req.user?.userId;

      if (!userId) {
        return next(new AppError("Unauthorized user", 401, 'UNAUTHORIZED'));
      }

      const requests = await nutritionistService.getMealPlanRequests(userId);

      return res.status(200).json({
        success: true,
        data: requests,
        error: null,
      });
    } catch (error) {
      console.error('NutritionistController.getMealPlanRequests Error:', error);
      const statusCode = error.statusCode || error.status || 500;
      return next(
        new AppError(
          error.message || "Failed to fetch meal plan requests",
          statusCode,
          error.errorCode || 'FETCH_MEAL_PLAN_REQUESTS_FAILED'
        ),
      );
    }
  }

  /**
   * POST /api/nutritionists/meal-plan-requests/:id/respond
   * Approve/reject a request (UC-13)
   */
  async respondToMealPlanRequest(req, res, next) {
    try {
      const userId = req.user?.id || req.user?.sub || req.user?.userId;
      const { id: requestId } = req.params;
      const { status } = req.body;

      if (!userId) {
        return next(new AppError("Unauthorized user", 401, 'UNAUTHORIZED'));
      }

      const result = await nutritionistService.respondToMealPlanRequest(
        userId,
        requestId,
        status,
      );

      return res.status(200).json({
        success: true,
        data: result,
        error: null,
      });
    } catch (error) {
      console.error('NutritionistController.respondToMealPlanRequest Error:', error);
      const statusCode = error.statusCode || error.status || 500;
      return next(
        new AppError(
          error.message || "Failed to respond to meal plan request",
          statusCode,
          error.errorCode || 'RESPOND_MEAL_PLAN_REQUEST_FAILED'
        ),
      );
    }
  }
}

module.exports = new NutritionistController();
