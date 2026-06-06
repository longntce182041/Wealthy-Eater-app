const RecipeReview = require('../models/RecipeReview');
const Recipe = require('../models/Recipe');
const User = require('../models/User');

/**
 * user.recipe.review.service.js
 *
 * Business logic for recipe ratings and text reviews.
 *
 * Key invariant: one review per (user, recipe) — add/update is idempotent.
 */

// ─── Add or update ────────────────────────────────────────────────────────────

/**
 * Create a new review or update the user's existing one for the given recipe.
 *
 * @param {string} userId
 * @param {string} recipeId
 * @param {number} rating  - Integer 1–5
 * @param {string} comment - Optional text
 * @returns {Promise<Document>} Saved review document
 */
async function upsertReview(userId, recipeId, rating, comment = '') {
  // Validate rating
  const ratingNum = Number(rating);
  if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    const err = new Error('Rating must be an integer between 1 and 5');
    err.statusCode = 400;
    throw err;
  }

  // Ensure recipe exists
  const recipe = await Recipe.findById(recipeId).lean();
  if (!recipe) {
    const err = new Error('Recipe not found');
    err.statusCode = 404;
    throw err;
  }

  // Upsert: update existing or create new
  let review = await RecipeReview.findOne({ user_id: userId, recipe_id: recipeId });

  if (review) {
    review.rating  = ratingNum;
    review.comment = comment.trim();
    await review.save();
  } else {
    review = await RecipeReview.create({
      user_id:   userId,
      recipe_id: recipeId,
      rating:    ratingNum,
      comment:   comment.trim(),
    });
  }

  return review;
}

// ─── Get reviews for a recipe ─────────────────────────────────────────────────

/**
 * Paginated list of reviews for a recipe, with reviewer name populated
 * and aggregate stats (avg rating, distribution).
 *
 * @param {string} recipeId
 * @param {{ page?, limit?, sortBy?, sortOrder? }} options
 */
async function getRecipeReviews(recipeId, options = {}) {
  const page      = Math.max(parseInt(options.page, 10)  || 1, 1);
  const limit     = Math.min(Math.max(parseInt(options.limit, 10) || 10, 1), 50);
  const skip      = (page - 1) * limit;
  const sortOrder = options.sortOrder === 'asc' ? 1 : -1;
  const sortField = options.sortBy === 'rating' ? 'rating' : 'createdAt';

  const [reviews, total] = await Promise.all([
    RecipeReview.find({ recipe_id: recipeId })
      .populate({ path: 'user_id', model: 'User', select: '_id email' })
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean(),
    RecipeReview.countDocuments({ recipe_id: recipeId }),
  ]);

  // 2. Fetch aggregate stats using MongoDB Aggregation Pipeline
  const aggResult = await RecipeReview.aggregate([
    { $match: { recipe_id: recipeId } },
    {
      $group: {
        _id: null,
        avgRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
        r5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
        r4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
        r3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
        r2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
        r1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
      }
    }
  ]);

  let avgRating = 0;
  let distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  
  if (aggResult.length > 0) {
    const stats = aggResult[0];
    avgRating = parseFloat((stats.avgRating || 0).toFixed(1));
    const t = stats.totalReviews || 1;
    distribution = {
      5: parseFloat(((stats.r5 / t) * 100).toFixed(1)),
      4: parseFloat(((stats.r4 / t) * 100).toFixed(1)),
      3: parseFloat(((stats.r3 / t) * 100).toFixed(1)),
      2: parseFloat(((stats.r2 / t) * 100).toFixed(1)),
      1: parseFloat(((stats.r1 / t) * 100).toFixed(1)),
    };
  }

  // Normalise reviewer name
  const normalised = reviews.map((rev) => {
    const user = rev.user_id;
    let userName = 'User';
    if (user && typeof user === 'object') {
      userName = user.name || (user.email ? user.email.split('@')[0] : 'User');
    }
    return { ...rev, user_id: { ...user, name: userName } };
  });

  return {
    reviews: normalised,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
    stats: {
      avgRating,
      totalReviews: total,
      distribution,
    },
  };
}

// ─── Get the logged-in user's review for one recipe ──────────────────────────

/**
 * @param {string} userId
 * @param {string} recipeId
 * @returns {Promise<Document|null>}
 */
async function getUserReviewForRecipe(userId, recipeId) {
  return RecipeReview.findOne({ user_id: userId, recipe_id: recipeId }).lean();
}

// ─── Get all reviews by a user (their review history) ────────────────────────

/**
 * @param {string} userId
 * @param {{ page?, limit?, sortBy?, sortOrder? }} options
 */
async function getUserReviews(userId, options = {}) {
  const page      = Math.max(parseInt(options.page, 10)  || 1, 1);
  const limit     = Math.min(Math.max(parseInt(options.limit, 10) || 10, 1), 50);
  const skip      = (page - 1) * limit;
  const sortOrder = options.sortOrder === 'asc' ? 1 : -1;

  const [reviews, total] = await Promise.all([
    RecipeReview.find({ user_id: userId })
      .populate({
        path:   'recipe_id',
        model:  'Recipe',
        select: '_id name image_url cooking_time level_cooking',
      })
      .sort({ createdAt: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean(),
    RecipeReview.countDocuments({ user_id: userId }),
  ]);

  return {
    reviews,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
  };
}

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * Delete a review. Only the review owner may delete it.
 *
 * @param {string} reviewId
 * @param {string} requestingUserId
 */
async function deleteReview(reviewId, requestingUserId) {
  const review = await RecipeReview.findById(reviewId);
  if (!review) {
    const err = new Error('Review not found');
    err.statusCode = 404;
    throw err;
  }

  if (review.user_id.toString() !== requestingUserId.toString()) {
    const err = new Error('You are not authorised to delete this review');
    err.statusCode = 403;
    throw err;
  }

  await RecipeReview.deleteOne({ _id: reviewId });
  return review;
}

module.exports = {
  upsertReview,
  getRecipeReviews,
  getUserReviewForRecipe,
  getUserReviews,
  deleteReview,
};
