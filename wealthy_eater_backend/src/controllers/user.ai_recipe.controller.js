const UserAiRecipe = require('../models/UserAiRecipe');
const AppError = require('../utils/AppError');

class UserAiRecipeController {
  
  // Save an AI recipe
  async saveRecipe(req, res, next) {
    try {
      const userId = req.user.id;
      const recipeData = req.body;

      if (!recipeData.mealName || typeof recipeData.mealName !== 'string') {
        return next(new AppError('Recipe mealName is required and must be a string', 400));
      }

      // Sanitize lengths to prevent excessively large payloads
      const mealName = recipeData.mealName.substring(0, 200);
      const description = recipeData.description ? String(recipeData.description).substring(0, 1000) : '';
      const difficulty = recipeData.difficulty ? String(recipeData.difficulty).substring(0, 50) : '';
      const healthNote = recipeData.healthNote ? String(recipeData.healthNote).substring(0, 1000) : '';

      const existingRecipe = await UserAiRecipe.findOne({ 
        user_id: userId, 
        mealName: mealName 
      });

      if (existingRecipe) {
        return next(new AppError('This recipe is already saved in your AI Saved tab.', 400));
      }

      // Normalize cookingSteps to Array of Strings
      let normalizedSteps = [];
      if (Array.isArray(recipeData.cookingSteps)) {
        normalizedSteps = recipeData.cookingSteps.map(step => {
          if (typeof step === 'string') return step;
          if (step && typeof step === 'object' && step.instruction) return String(step.instruction);
          return JSON.stringify(step);
        }).map(str => str.substring(0, 2000)); // limit step length
      }

      const newRecipe = new UserAiRecipe({
        user_id: userId,
        mealName: mealName,
        description: description,
        cookingTimeMinutes: parseInt(recipeData.cookingTimeMinutes) || 0,
        difficulty: difficulty,
        healthNote: healthNote,
        cookingSteps: normalizedSteps
      });

      await newRecipe.save();

      res.status(201).json({
        success: true,
        data: newRecipe,
        error: null
      });
    } catch (error) {
      next(error);
    }
  }

  // Get all saved AI recipes for the current user
  async getMyAiRecipes(req, res, next) {
    try {
      const userId = req.user.id;

      const recipes = await UserAiRecipe.find({ user_id: userId }).sort({ created_at: -1 });

      res.status(200).json({
        success: true,
        data: recipes,
        error: null
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete an AI recipe
  async deleteAiRecipe(req, res, next) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const recipe = await UserAiRecipe.findOne({ _id: id, user_id: userId });
      
      if (!recipe) {
        return next(new AppError('Recipe not found or you do not have permission', 404));
      }

      await UserAiRecipe.deleteOne({ _id: id });

      res.status(200).json({
        success: true,
        data: { message: 'Recipe deleted successfully' },
        error: null
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserAiRecipeController();
