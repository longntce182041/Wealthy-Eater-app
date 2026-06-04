const mongoose = require('mongoose');

/**
 * RecipeReview — stores user ratings and comments for recipes.
 *
 * Rules:
 * - One review per user per recipe (compound unique index).
 * - Rating must be an integer in [1, 5].
 * - Comment is optional (defaults to empty string).
 * - Timestamps auto-managed (createdAt / updatedAt).
 */
const RecipeReviewSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    user_id: {
      type: String,
      ref: 'User',
      required: true,
    },
    recipe_id: {
      type: String,
      ref: 'Recipe',
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating must be at most 5'],
    },
    comment: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true }
);

// Enforce one review per user per recipe
RecipeReviewSchema.index({ user_id: 1, recipe_id: 1 }, { unique: true });

// For GET /recipes/:id/reviews — newest first
RecipeReviewSchema.index({ recipe_id: 1, createdAt: -1 });

// For GET /recipes/reviews/mine — user's own reviews
RecipeReviewSchema.index({ user_id: 1, createdAt: -1 });

module.exports = mongoose.model('RecipeReview', RecipeReviewSchema);