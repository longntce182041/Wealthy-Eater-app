const AppError = require('../utils/AppError');
const userRecipeService = require('../services/user.recipe.service');

// ════════════════════════════════════════════════════════════
// UC-71 - VIEW LIST RECIPES
// ════════════════════════════════════════════════════════════
async function list(req, res, next) {
  try {
    const result = await userRecipeService.list(req.query || {});
    
    return res.json({
      success: true,
      message: 'Recipes loaded successfully',
      data: result.data,
      meta: result.meta,
      error: null,
    });
  } catch (err) {
    return next(new AppError(err.message || 'Failed to load recipes', 500));
  }
}

// ════════════════════════════════════════════════════════════
// UC-72 - VIEW DETAIL RECIPES
// ════════════════════════════════════════════════════════════
async function detail(req, res, next) {
  try {
    const recipeId = req.params.id;
    const data = await userRecipeService.detail(recipeId);

    return res.json({
      success: true,
      message: 'Recipe loaded successfully',
      data,
      error: null,
    });
  } catch (err) {
    if (err instanceof AppError) {
      return next(err);
    }
    return next(new AppError(err.message || 'Failed to load recipe', 500));
  }
}

module.exports = {
  list,
  detail,
};