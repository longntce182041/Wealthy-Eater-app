const AppError = require('../utils/AppError');
const reviewService = require('../services/user.recipe.review.service');

/**
 * user.recipe.review.controller.js
 *
 * HTTP layer for recipe reviews (ratings + comments).
 * All business logic lives in user.recipe.review.service.js.
 */

// ─── POST /api/recipes/:id/reviews ───────────────────────────────────────────

/**
 * Add or update the authenticated user's review for a recipe.
 * Idempotent: calling again just updates the existing review.
 */
async function upsertReview(req, res, next) {
  try {
    const userId = req.user.sub;
    const recipeId = req.params.id;
    const { rating, comment = '' } = req.body;

    // Controller-level guard — service also validates, but catch early for clear errors
    if (rating === undefined || rating === null) {
      return next(new AppError('rating is required', 400, 'VALIDATION_ERROR'));
    }

    const review = await reviewService.upsertReview(userId, recipeId, rating, comment);

    return res.status(200).json({
      success: true,
      message: 'Review saved',
      data: {
        id:        review._id,
        rating:    review.rating,
        comment:   review.comment,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
      },
      error: null,
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return next(new AppError(err.message || 'Failed to save review', status));
  }
}

// ─── GET /api/recipes/:id/reviews ────────────────────────────────────────────

/**
 * Get paginated reviews for a recipe.
 * Includes aggregate stats: avgRating, totalReviews, distribution.
 * Powers the "Reviews" tab on the Recipe Detail screen.
 */
async function getRecipeReviews(req, res, next) {
  try {
    const { id: recipeId } = req.params;
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const result = await reviewService.getRecipeReviews(recipeId, {
      page:      parseInt(page, 10),
      limit:     parseInt(limit, 10),
      sortBy,
      sortOrder,
    });

    return res.json({
      success: true,
      data: {
        reviews:    result.reviews,
        stats:      result.stats,
      },
      meta: result.pagination,
      error: null,
    });
  } catch (err) {
    return next(new AppError(err.message || 'Failed to load reviews', 500));
  }
}

// ─── GET /api/recipes/:id/reviews/mine ───────────────────────────────────────

/**
 * Get the current user's review for a specific recipe (null if none).
 * Used by the mobile to pre-fill the review form.
 */
async function getMyReview(req, res, next) {
  try {
    const userId = req.user.sub;
    const recipeId = req.params.id;

    const review = await reviewService.getUserReviewForRecipe(userId, recipeId);

    return res.json({
      success: true,
      data: {
        review: review
          ? {
              id:        review._id,
              rating:    review.rating,
              comment:   review.comment,
              createdAt: review.createdAt,
              updatedAt: review.updatedAt,
            }
          : null,
      },
      error: null,
    });
  } catch (err) {
    return next(new AppError(err.message || 'Failed to load your review', 500));
  }
}

// ─── GET /api/recipes/reviews/mine ───────────────────────────────────────────

/**
 * Get all reviews the current user has written across all recipes.
 * Powers the "Reviews" sub-tab in the user's profile / account page.
 */
async function getAllMyReviews(req, res, next) {
  try {
    const userId = req.user.sub;
    const { page = 1, limit = 10, sortOrder = 'desc' } = req.query;

    const result = await reviewService.getUserReviews(userId, {
      page:      parseInt(page, 10),
      limit:     parseInt(limit, 10),
      sortOrder,
    });

    return res.json({
      success: true,
      data:    result.reviews,
      meta:    result.pagination,
      error: null,
    });
  } catch (err) {
    return next(new AppError(err.message || 'Failed to load reviews', 500));
  }
}

// ─── DELETE /api/recipes/reviews/:reviewId ────────────────────────────────────

/**
 * Delete a review. Only the review owner may perform this.
 */
async function deleteReview(req, res, next) {
  try {
    const userId = req.user.sub;
    const { reviewId } = req.params;

    await reviewService.deleteReview(reviewId, userId);

    return res.json({ success: true, data: null, error: null });
  } catch (err) {
    const status = err.statusCode || 500;
    return next(new AppError(err.message || 'Failed to delete review', status));
  }
}

module.exports = {
  upsertReview,
  getRecipeReviews,
  getMyReview,
  getAllMyReviews,
  deleteReview,
};
