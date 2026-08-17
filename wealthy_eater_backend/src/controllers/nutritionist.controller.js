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
  async getNutritionists(req, res, next) {
    try {
      const { page, limit } = req.query;
      const result = await nutritionistService.getAllApprovedNutritionists({ page, limit });

      return res.status(200).json({
        success: true,
        data: result.nutritionists,
        meta: result.pagination,
        error: null,
      });
    } catch (error) {
      console.error('NutritionistController.getNutritionists Error:', error);
      return next(new AppError('Failed to fetch nutritionists. Please try again later.', 500));
    }
  }

  /**
   * GET /api/nutritionists/meal-plan-requests
   */
  async getMealPlanRequests(req, res, next) {
    try {
      const nutritionistUserId = req.user.id;
      const requests = await nutritionistService.getMealPlanRequests(nutritionistUserId);

      return res.status(200).json({
        success: true,
        data: requests,
        error: null
      });
    } catch (error) {
      console.error('NutritionistController.getMealPlanRequests Error:', error.message);
      const statusCode = error.statusCode || error.status || 500;
      return next(new AppError(error.message || 'Failed to fetch meal plan requests.', statusCode, 'FETCH_MEAL_PLAN_REQUESTS_ERROR'));
    }
  }

  /**
   * POST /api/nutritionists/meal-plan-requests/:id/respond
   */
  async respondToMealPlanRequest(req, res, next) {
    try {
      const nutritionistUserId = req.user.id;
      const requestId = req.params.id;
      const { status } = req.body;

      const request = await nutritionistService.respondToMealPlanRequest(nutritionistUserId, requestId, status);

      // Emit real-time status update to the user
      const io = req.app.get('io');
      if (io && request.user_id) {
        io.to(request.user_id.toString()).emit('meal_plan_status_updated', {
          id: request._id,
          status: request.status,
        });
      }

      return res.status(200).json({
        success: true,
        data: request,
        error: null
      });
    } catch (error) {
      console.error('NutritionistController.respondToMealPlanRequest Error:', error.message);
      const statusCode = error.statusCode || error.status || 500;
      return next(new AppError(error.message || 'Failed to respond to meal plan request.', statusCode, 'RESPOND_MEAL_PLAN_REQUEST_ERROR'));
    }
  }

  /**
   * GET /api/nutritionists/profile/me
   */
  async getNutritionistProfile(req, res, next) {
    try {
      const userId = req.user?.id || req.user?.sub;
      if (!userId) {
        throw new AppError("Unauthorized user", 401);
      }
      const profile = await nutritionistService.getNutritionistProfileByUserId(userId);
      return res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      console.error('NutritionistController.getNutritionistProfile Error:', error.message);
      const statusCode = error.statusCode || error.status || 500;
      return next(new AppError(error.message || 'Failed to fetch nutritionist profile.', statusCode));
    }
  }

  /**
   * PUT /api/nutritionists/profile/me
   */
  async updateNutritionistProfile(req, res, next) {
    try {
      const userId = req.user?.id || req.user?.sub;
      if (!userId) {
        throw new AppError("Unauthorized user", 401);
      }
      const result = await nutritionistService.updateNutritionistProfileByUserId(
        userId,
        req.body,
        req.file
      );
      return res.status(200).json({
        success: true,
        message: "Nutritionist profile updated successfully",
        data: result,
      });
    } catch (error) {
      console.error('NutritionistController.updateNutritionistProfile Error:', error.message);
      const statusCode = error.statusCode || error.status || 500;
      return next(new AppError(error.message || 'Failed to update nutritionist profile.', statusCode));
    }
  }
}

module.exports = new NutritionistController();
