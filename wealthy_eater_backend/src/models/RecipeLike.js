const mongoose = require('mongoose');

/**
 * RecipeLike — tracks which recipes a user has liked / saved as a favorite.
 *
 * Rules:
 * - One like per user per recipe (compound unique index ensures idempotency).
 * - Timestamps auto-managed (createdAt used for "newest liked" sorting).
 */
const RecipeLikeSchema = new mongoose.Schema(
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
  },
  { timestamps: true }
);

// Prevent duplicate likes and enable fast toggle check
RecipeLikeSchema.index({ user_id: 1, recipe_id: 1 }, { unique: true });

// Fastest path for GET /recipes/liked — newest liked recipes first
RecipeLikeSchema.index({ user_id: 1, createdAt: -1 });

// Count how many likes a recipe has
RecipeLikeSchema.index({ recipe_id: 1 });

module.exports = mongoose.model('RecipeLike', RecipeLikeSchema);
