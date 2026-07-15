const pantryService = require('../services/pantry.service');
const AppError = require('../utils/AppError');

class PantryController {
  /**
   * GET /api/pantry
   * Retrieves the user's pantry.
   */
  async getPantry(req, res, next) {
    try {
      const userId = req.user.id || req.user.sub;
      if (!userId) {
        return next(new AppError('User not authenticated', 401, 'UNAUTHORIZED'));
      }
      
      const pantry = await pantryService.getPantry(userId);
      return res.status(200).json({
        success: true,
        data: pantry,
        error: null
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * POST /api/pantry/manual
   * Overwrites the pantry ingredients array.
   */
  async updatePantry(req, res, next) {
    try {
      const userId = req.user.id || req.user.sub;
      if (!userId) {
        return next(new AppError('User not authenticated', 401, 'UNAUTHORIZED'));
      }

      const { ingredients } = req.body;
      if (!ingredients || !Array.isArray(ingredients)) {
        return next(new AppError('ingredients list must be an array', 400, 'VALIDATION_ERROR'));
      }

      const pantry = await pantryService.updatePantryManual(userId, ingredients);
      return res.status(200).json({
        success: true,
        data: pantry,
        error: null
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * POST /api/pantry/scan
   * Processes a pantry photo and returns identified ingredients.
   */
  async scanPantry(req, res, next) {
    try {
      const userId = req.user.id || req.user.sub;
      if (!userId) {
        return next(new AppError('User not authenticated', 401, 'UNAUTHORIZED'));
      }

      if (!req.file) {
        return next(new AppError('No image file uploaded', 400, 'VALIDATION_ERROR'));
      }

      const scannedIngredients = await pantryService.scanPantryImage(req.file);
      return res.status(200).json({
        success: true,
        data: scannedIngredients,
        error: null
      });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new PantryController();
