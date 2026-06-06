const mongoose = require('mongoose');

/**
 * ShoppingList.js
 *
 * Tracks individual grocery / shopping list items for a user.
 * Each document represents one ingredient line from a recipe that the
 * user intends to purchase (or has already purchased).
 *
 * Key design decisions:
 * - `ingredient_name` is a snapshot so the list remains accurate even if the
 *   Ingredient master record is later renamed.
 * - `quantity` + `unit` are required so the smart accumulation algorithm can
 *   combine duplicate ingredients from multiple recipes.
 * - Compound index on { user_id, is_purchase } speeds up the common query of
 *   "show me all un-purchased items for user X".
 */

const ShoppingListSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => new mongoose.Types.ObjectId().toString(),
  },

  // ── Owner ──────────────────────────────────────────────────────────────────
  user_id: {
    type: String,
    ref: 'User',
    required: true,
  },

  // ── Ingredient snapshot ────────────────────────────────────────────────────
  ingredient_id: {
    type: String,
    ref: 'Ingredient',
    required: true,
  },
  ingredient_name: {
    type: String,
    required: true,
    trim: true,
  },

  // ── Quantity — required for smart accumulation ────────────────────────────
  quantity: {
    type: Number,
    required: true,
    min: [0, 'Quantity cannot be negative'],
  },
  unit: {
    type: String,
    required: true,
    trim: true,
  },

  // ── Source recipe ──────────────────────────────────────────────────────────
  // Nullable: when quantities from multiple recipes are consolidated, we
  // clear recipe_id to reflect the merged origin.
  recipe_id: {
    type: String,
    ref: 'Recipe',
    default: null,
  },

  // ── Categorisation (for grouped UI display) ────────────────────────────────
  category: {
    type: String,
    trim: true,
    default: 'Other',
  },

  // ── Status ────────────────────────────────────────────────────────────────
  is_purchase: {
    type: Boolean,
    default: false,
  },
  purchase_at: {
    type: Date,
    default: null,
  },

  // ── Timestamps ────────────────────────────────────────────────────────────
  add_at: {
    type: Date,
    default: Date.now,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

// ── Indexes ─────────────────────────────────────────────────────────────────

// Primary query pattern: fetch all items for a user, filter by purchase status
ShoppingListSchema.index({ user_id: 1, is_purchase: 1 });

// Secondary: look up existing item for a specific user + ingredient (accumulation check)
ShoppingListSchema.index({ user_id: 1, ingredient_id: 1 });

module.exports = mongoose.model('ShoppingList', ShoppingListSchema);