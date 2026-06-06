const RecipeLike = require('../models/RecipeLike');
const Recipe = require('../models/Recipe');

/**
 * user.recipe.like.service.js
 *
 * Handles all business logic for recipe likes (favorites).
 * All functions throw on unrecoverable errors so controllers can catch centrally.
 */

// ─── Toggle ──────────────────────────────────────────────────────────────────

/**
 * Toggle like status for a recipe.
 * - If already liked  → remove and return { action: 'removed', isLiked: false }
 * - If not yet liked  → add    and return { action: 'added',   isLiked: true  }
 *
 * @param {string} userId
 * @param {string} recipeId
 */
async function toggleLike(userId, recipeId) {
  // Ensure recipe exists
  const recipe = await Recipe.findById(recipeId).lean();
  if (!recipe) {
    const err = new Error('Recipe not found');
    err.statusCode = 404;
    throw err;
  }

  const existing = await RecipeLike.findOne({ user_id: userId, recipe_id: recipeId });

  if (existing) {
    await RecipeLike.deleteOne({ _id: existing._id });
    return { action: 'removed', isLiked: false, likeId: null };
  }

  const like = new RecipeLike({ user_id: userId, recipe_id: recipeId });
  await like.save();
  return { action: 'added', isLiked: true, likeId: like._id };
}

// ─── Check status ─────────────────────────────────────────────────────────────

/**
 * Check whether a user has liked a specific recipe.
 *
 * @param {string} userId
 * @param {string} recipeId
 * @returns {Promise<boolean>}
 */
async function isLiked(userId, recipeId) {
  const like = await RecipeLike.findOne({ user_id: userId, recipe_id: recipeId }).lean();
  return like !== null;
}

// ─── Get liked recipes ────────────────────────────────────────────────────────

/**
 * Return paginated list of recipes the user has liked, newest first.
 *
 * @param {string} userId
 * @param {{ page?: number, limit?: number }} options
 */
async function getLikedRecipes(userId, options = {}) {
  const page = Math.max(parseInt(options.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(options.limit, 10) || 20, 1), 100);
  const skip = (page - 1) * limit;

  const [likes, total] = await Promise.all([
    RecipeLike.find({ user_id: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: 'recipe_id', model: 'Recipe' })
      .lean(),
    RecipeLike.countDocuments({ user_id: userId }),
  ]);

  // Filter out likes where the recipe was deleted
  const validLikes = likes.filter((l) => l.recipe_id != null);

  return {
    items: validLikes.map((l) => ({
      likeId: l._id,
      likedAt: l.createdAt,
      recipe: l.recipe_id,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
  };
}

// ─── Count ────────────────────────────────────────────────────────────────────

/**
 * How many users have liked a specific recipe.
 *
 * @param {string} recipeId
 * @returns {Promise<number>}
 */
async function getLikeCount(recipeId) {
  return RecipeLike.countDocuments({ recipe_id: recipeId });
}

/**
 * How many recipes a user has liked.
 *
 * @param {string} userId
 * @returns {Promise<number>}
 */
async function getUserLikeCount(userId) {
  return RecipeLike.countDocuments({ user_id: userId });
}

// ─── Batch status (used when rendering a list of recipes) ────────────────────

/**
 * Get like status for multiple recipe IDs at once.
 * Returns a Map: recipeId → boolean
 *
 * @param {string}   userId
 * @param {string[]} recipeIds
 * @returns {Promise<Record<string, boolean>>}
 */
async function getBatchLikeStatus(userId, recipeIds) {
  if (!recipeIds.length) return {};

  const likes = await RecipeLike.find({
    user_id: userId,
    recipe_id: { $in: recipeIds },
  })
    .select('recipe_id')
    .lean();

  const likedSet = new Set(likes.map((l) => l.recipe_id.toString()));
  return Object.fromEntries(recipeIds.map((id) => [id, likedSet.has(id)]));
}

module.exports = {
  toggleLike,
  isLiked,
  getLikedRecipes,
  getLikeCount,
  getUserLikeCount,
  getBatchLikeStatus,
};
