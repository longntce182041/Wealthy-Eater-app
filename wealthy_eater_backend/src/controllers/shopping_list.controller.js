const AppError = require('../utils/AppError');
const mongoose = require('mongoose');
const shoppingListService = require('../services/shopping_list.service');

/**
 * shopping_list.controller.js
 *
 * HTTP layer for the Smart Grocery / Shopping List feature.
 * All business logic is delegated to shopping_list.service.js.
 *
 * Every response uses the project-standard envelope:
 *   { success: boolean, data: object | array | null, error: { code, message } | null }
 */

// ─── POST /api/shopping-list/add-from-recipe ──────────────────────────────────

/**
 * Add all ingredients from a recipe to the user's shopping list.
 * Quantities are automatically accumulated if the ingredient already exists.
 *
 * Body: { recipeId: string, servings?: number }
 */
async function addFromRecipe(req, res, next) {
  try {
    const userId = req.user.sub || req.user.id;
    const { recipeId, servings, customIngredients } = req.body;

    if (!recipeId || typeof recipeId !== 'string' || !recipeId.trim()) {
      return next(new AppError('recipeId is required', 400, 'VALIDATION_ERROR'));
    }

    let parsedServings;
    if (servings !== undefined) {
      parsedServings = Number(servings);
      if (isNaN(parsedServings) || parsedServings < 1 || parsedServings > 100) {
        return next(new AppError('Servings must be a number between 1 and 100', 400, 'VALIDATION_ERROR'));
      }
    }

    const items = await shoppingListService.addFromRecipe(
      userId,
      recipeId.trim(),
      parsedServings,
      customIngredients,
    );

    return res.status(201).json({
      success: true,
      data:    { items, count: items.length },
      error:   null,
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return next(new AppError(err.message || 'Failed to add ingredients to shopping list', status, err.code || 'INTERNAL_ERROR'));
  }
}

// ─── GET /api/shopping-list ───────────────────────────────────────────────────

/**
 * Return the current user's full shopping list, grouped by ingredient category.
 * Query params: page (default 1), limit (default 200)
 */
async function getList(req, res, next) {
  try {
    const userId = req.user.sub || req.user.id;
    const { page = 1, limit = 200 } = req.query;

    const result = await shoppingListService.getUserShoppingList(userId, {
      page:  parseInt(page, 10),
      limit: parseInt(limit, 10),
    });

    return res.json({
      success: true,
      data:    {
        items:   result.items,
        grouped: result.grouped,
      },
      meta:    result.pagination,
      error:   null,
    });
  } catch (err) {
    return next(new AppError(err.message || 'Failed to load shopping list', 500, 'INTERNAL_ERROR'));
  }
}

// ─── PATCH /api/shopping-list/:itemId/toggle ──────────────────────────────────

/**
 * Toggle the purchased status of a single item.
 * Flips is_purchase; sets/clears purchase_at timestamp accordingly.
 */
async function togglePurchased(req, res, next) {
  try {
    const userId = req.user.sub || req.user.id;
    const { itemId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return next(new AppError('Invalid Item ID format', 400, 'INVALID_ID'));
    }

    const item = await shoppingListService.togglePurchased(itemId, userId);

    return res.json({
      success: true,
      data:    item.toObject ? item.toObject({ versionKey: false }) : item,
      error:   null,
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return next(new AppError(err.message || 'Failed to toggle item', status, err.code || 'INTERNAL_ERROR'));
  }
}

// ─── DELETE /api/shopping-list/:itemId ───────────────────────────────────────

/**
 * Permanently delete a single shopping list item.
 */
async function removeItem(req, res, next) {
  try {
    const userId = req.user.sub || req.user.id;
    const { itemId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return next(new AppError('Invalid Item ID format', 400, 'INVALID_ID'));
    }

    const deleted = await shoppingListService.removeItem(itemId, userId);

    return res.json({
      success: true,
      data:    { deletedId: deleted._id },
      error:   null,
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return next(new AppError(err.message || 'Failed to remove item', status, err.code || 'INTERNAL_ERROR'));
  }
}

// ─── DELETE /api/shopping-list/clear/purchased ───────────────────────────────

/**
 * Remove all items the user has marked as purchased.
 */
async function clearPurchased(req, res, next) {
  try {
    const userId = req.user.sub || req.user.id;
    const result = await shoppingListService.clearPurchased(userId);

    return res.json({
      success: true,
      data:    result,
      error:   null,
    });
  } catch (err) {
    return next(new AppError(err.message || 'Failed to clear purchased items', 500, 'INTERNAL_ERROR'));
  }
}

// ─── DELETE /api/shopping-list/clear/all ─────────────────────────────────────

/**
 * Remove every item in the user's shopping list.
 */
async function clearAll(req, res, next) {
  try {
    const userId = req.user.sub || req.user.id;
    const result = await shoppingListService.clearAll(userId);

    return res.json({
      success: true,
      data:    result,
      error:   null,
    });
  } catch (err) {
    return next(new AppError(err.message || 'Failed to clear all items', 500, 'INTERNAL_ERROR'));
  }
}

// ─── GET /api/shopping-list/stats ────────────────────────────────────────────

/**
 * Return completion statistics: total, purchased, pending, percentage.
 */
async function getStats(req, res, next) {
  try {
    const userId = req.user.sub || req.user.id;
    const stats  = await shoppingListService.getStats(userId);

    return res.json({
      success: true,
      data:    stats,
      error:   null,
    });
  } catch (err) {
    return next(new AppError(err.message || 'Failed to fetch stats', 500, 'INTERNAL_ERROR'));
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  addFromRecipe,
  getList,
  togglePurchased,
  removeItem,
  clearPurchased,
  clearAll,
  getStats,
};
