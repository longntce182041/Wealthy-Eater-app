const likeService = require('../services/recipe.like.service');

/**
 * recipe.like.controller.js
 *
 * HTTP layer for recipe like / favorite operations.
 * All business logic lives in recipe.like.service.js.
 */

// ─── POST /api/recipes/:id/like  (toggle) ────────────────────────────────────

/**
 * Toggle like on a recipe.
 * Returns the new isLiked state so the client can update UI without a second request.
 */
async function toggleLike(req, res) {
  try {
    const userId = req.user.sub;
    const recipeId = req.params.id;

    const result = await likeService.toggleLike(userId, recipeId);

    return res.status(result.action === 'added' ? 201 : 200).json({
      success: true,
      message: result.action === 'added' ? 'Recipe liked' : 'Recipe unliked',
      data: {
        isLiked: result.isLiked,
        action:  result.action,
        likeId:  result.likeId,
      },
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message || 'Failed to toggle like' });
  }
}

// ─── GET /api/recipes/:id/like/status ────────────────────────────────────────

async function getLikeStatus(req, res) {
  try {
    const userId = req.user.sub;
    const recipeId = req.params.id;

    const liked      = await likeService.isLiked(userId, recipeId);
    const likeCount  = await likeService.getLikeCount(recipeId);

    return res.json({
      success: true,
      data: { isLiked: liked, likeCount },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Failed to get like status' });
  }
}

// ─── GET /api/recipes/liked ──────────────────────────────────────────────────

/**
 * Get the current user's liked recipes (paginated).
 * Powers the "Liked" tab on the mobile Recipe navtab.
 */
async function getLikedRecipes(req, res) {
  try {
    const userId = req.user.sub;
    const { page = 1, limit = 20 } = req.query;

    const result = await likeService.getLikedRecipes(userId, {
      page:  parseInt(page, 10),
      limit: parseInt(limit, 10),
    });

    return res.json({
      success: true,
      data: result.items,
      meta: result.pagination,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Failed to load liked recipes' });
  }
}

// ─── GET /api/recipes/liked/count ────────────────────────────────────────────

async function getLikeCount(req, res) {
  try {
    const userId = req.user.sub;
    const count  = await likeService.getUserLikeCount(userId);
    return res.json({ success: true, data: { count } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Failed to get count' });
  }
}

module.exports = { toggleLike, getLikeStatus, getLikedRecipes, getLikeCount };
