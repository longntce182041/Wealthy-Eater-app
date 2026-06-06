const ShoppingList    = require('../models/ShoppingList');
const RecipeIngredient = require('../models/RecipeIngredient');
const Recipe           = require('../models/Recipe');
const Ingredient       = require('../models/Ingredient');

/**
 * shopping_list.service.js
 *
 * Business logic for the Smart Grocery / Shopping List feature.
 *
 * Core algorithm — "smart accumulation":
 * When a user adds a recipe's ingredients, each ingredient is checked against
 * their existing un-purchased items:
 *   - If the same ingredient already exists (not yet purchased) → accumulate
 *     the quantity in-place (no duplicate row is created).
 *   - If the ingredient is new → insert a fresh ShoppingList document.
 *
 * This keeps the list clean regardless of how many times a user adds recipes.
 *
 * All functions throw enriched errors (err.statusCode, err.code) so the
 * controller layer can map them to the correct HTTP status without leaking
 * implementation details.
 */

// ─── Category helper ─────────────────────────────────────────────────────────

/**
 * Infer a display category from ingredient name / description.
 * This is a best-effort heuristic used when no category field exists in
 * the Ingredient master record.
 *
 * @param {string} name
 * @returns {string}
 */
function inferCategory(name = '') {
  const n = name.toLowerCase();

  if (/chicken|beef|pork|lamb|fish|shrimp|salmon|tuna|egg|tofu|tempeh/.test(n))
    return 'Protein';
  if (/milk|cream|cheese|butter|yogurt|dairy/.test(n))
    return 'Dairy';
  if (/flour|sugar|salt|pepper|oil|vinegar|sauce|soy|honey|spice|herb|cumin|turmeric|cinnamon|ginger|garlic|onion|chili/.test(n))
    return 'Pantry';
  if (/tomato|carrot|broccoli|spinach|lettuce|kale|cabbage|mushroom|potato|sweet potato|pepper|zucchini|corn|pea|bean|lentil|vegetable/.test(n))
    return 'Vegetable';
  if (/apple|banana|orange|mango|strawberry|blueberry|grape|lemon|lime|avocado|fruit/.test(n))
    return 'Fruit';
  if (/bread|pasta|rice|noodle|cereal|oat|quinoa|grain/.test(n))
    return 'Grain';

  return 'Other';
}

// ─── addFromRecipe ────────────────────────────────────────────────────────────

/**
 * Extract all ingredients from a recipe and add (or accumulate) them into
 * the user's shopping list.
 *
 * Steps:
 * 1. Verify the recipe exists.
 * 2. Fetch all RecipeIngredient records (populated with Ingredient master data).
 * 3. For each ingredient:
 *    a. Check if an un-purchased item already exists for this user + ingredient.
 *    b. If yes → accumulate the base_quantity (scale by `servings` ratio).
 *    c. If no  → insert a new ShoppingList document.
 * 4. Return the list of upserted items.
 *
 * @param {string} userId
 * @param {string} recipeId
 * @param {number} [servings=1] - Multiplier; defaults to recipe's base_servings.
 * @returns {Promise<Array>} Array of ShoppingList documents (upserted)
 */
async function addFromRecipe(userId, recipeId, servings) {
  // 1. Verify recipe exists
  const recipe = await Recipe.findById(recipeId).lean();
  if (!recipe) {
    const err = new Error('Recipe not found');
    err.statusCode = 404;
    err.code = 'RECIPE_NOT_FOUND';
    throw err;
  }

  // 2. Fetch recipe ingredients, populate Ingredient master for name/unit/category
  const recipeIngredients = await RecipeIngredient.find({ recipe_id: recipeId })
    .populate({ path: 'ingredient_id', model: 'Ingredient' })
    .lean();

  if (!recipeIngredients.length) {
    const err = new Error('This recipe has no ingredients to add');
    err.statusCode = 422;
    err.code = 'NO_INGREDIENTS';
    throw err;
  }

  // Compute serving multiplier
  const baseServings  = recipe.base_servings || 1;
  const targetServings = servings && servings > 0 ? servings : baseServings;
  const multiplier    = targetServings / baseServings;

  // 3. Smart accumulation using bulkWrite
  const mongoose = require('mongoose');
  const bulkOps = [];
  const ingredientIds = [];

  for (const ri of recipeIngredients) {
    const ingredient = ri.ingredient_id; // populated document or null
    if (!ingredient) continue;           // skip orphaned RecipeIngredient rows

    const ingredientId   = ingredient._id.toString();
    const ingredientName = ingredient.name;
    const baseQty        = parseFloat(((ri.base_quantity || 0) * multiplier).toFixed(4));
    const unit           = ri.unit || ingredient.unit || '';
    const category       = inferCategory(ingredientName);

    ingredientIds.push(ingredientId);

    bulkOps.push({
      updateOne: {
        filter: { 
          user_id:       userId,
          ingredient_id: ingredientId,
          is_purchase:   false,
        },
        update: {
          $inc: { quantity: baseQty },
          $setOnInsert: { 
            _id: new mongoose.Types.ObjectId().toString(),
            recipe_id: recipeId,
            add_at: new Date(),
            created_at: new Date()
          },
          $set: { 
            ingredient_name: ingredientName,
            unit: unit,
            category: category
          }
        },
        upsert: true
      }
    });
  }

  if (bulkOps.length > 0) {
    await ShoppingList.bulkWrite(bulkOps);
  }

  // Fetch and return the updated items
  const upsertedItems = await ShoppingList.find({
    user_id: userId,
    ingredient_id: { $in: ingredientIds },
    is_purchase: false
  }).lean();

  return upsertedItems;
}

// ─── getUserShoppingList ──────────────────────────────────────────────────────

/**
 * Fetch the user's full shopping list, sorted and grouped by category.
 *
 * Sort order: un-purchased items first (by add_at desc), then purchased items.
 *
 * @param {string} userId
 * @param {{ page?: number, limit?: number }} options
 * @returns {Promise<{ items: Array, grouped: Object, pagination: Object }>}
 */
async function getUserShoppingList(userId, options = {}) {
  const page  = Math.max(parseInt(options.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(options.limit, 10) || 200, 1), 500);
  const skip  = (page - 1) * limit;

  const [items, total] = await Promise.all([
    ShoppingList.find({ user_id: userId })
      // Un-purchased first (is_purchase: false=0 < true=1), newest added first
      .sort({ is_purchase: 1, add_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ShoppingList.countDocuments({ user_id: userId }),
  ]);

  // Group by category
  const grouped = {};
  for (const item of items) {
    const cat = item.category || 'Other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  }

  return {
    items,
    grouped,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
  };
}

// ─── togglePurchased ──────────────────────────────────────────────────────────

/**
 * Toggle the is_purchase status of a single shopping list item.
 * Ownership is strictly enforced — users may only modify their own items.
 *
 * @param {string} itemId
 * @param {string} userId
 * @returns {Promise<Document>} Updated ShoppingList document
 */
async function togglePurchased(itemId, userId) {
  const item = await ShoppingList.findById(itemId);

  if (!item) {
    const err = new Error('Shopping list item not found');
    err.statusCode = 404;
    err.code = 'ITEM_NOT_FOUND';
    throw err;
  }

  if (item.user_id.toString() !== userId.toString()) {
    const err = new Error('You are not authorised to modify this item');
    err.statusCode = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }

  item.is_purchase = !item.is_purchase;
  item.purchase_at = item.is_purchase ? new Date() : null;
  await item.save();

  return item;
}

// ─── removeItem ───────────────────────────────────────────────────────────────

/**
 * Permanently delete a single shopping list item.
 * Ownership is enforced.
 *
 * @param {string} itemId
 * @param {string} userId
 * @returns {Promise<Document>} The deleted document (for confirmation)
 */
async function removeItem(itemId, userId) {
  const item = await ShoppingList.findById(itemId);

  if (!item) {
    const err = new Error('Shopping list item not found');
    err.statusCode = 404;
    err.code = 'ITEM_NOT_FOUND';
    throw err;
  }

  if (item.user_id.toString() !== userId.toString()) {
    const err = new Error('You are not authorised to delete this item');
    err.statusCode = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }

  await ShoppingList.deleteOne({ _id: itemId });
  return item;
}

// ─── clearPurchased ───────────────────────────────────────────────────────────

/**
 * Remove all items that the user has marked as purchased.
 *
 * @param {string} userId
 * @returns {Promise<{ deletedCount: number }>}
 */
async function clearPurchased(userId) {
  const result = await ShoppingList.deleteMany({
    user_id:     userId,
    is_purchase: true,
  });
  return { deletedCount: result.deletedCount };
}

// ─── clearAll ─────────────────────────────────────────────────────────────────

/**
 * Remove every item in the user's shopping list (purchased + un-purchased).
 *
 * @param {string} userId
 * @returns {Promise<{ deletedCount: number }>}
 */
async function clearAll(userId) {
  const result = await ShoppingList.deleteMany({ user_id: userId });
  return { deletedCount: result.deletedCount };
}

// ─── getStats ─────────────────────────────────────────────────────────────────

/**
 * Compute quick completion statistics for a user's shopping list.
 *
 * @param {string} userId
 * @returns {Promise<{ total, purchased, pending, percentage }>}
 */
async function getStats(userId) {
  const [total, purchased] = await Promise.all([
    ShoppingList.countDocuments({ user_id: userId }),
    ShoppingList.countDocuments({ user_id: userId, is_purchase: true }),
  ]);

  const pending    = total - purchased;
  const percentage = total > 0 ? Math.round((purchased / total) * 100) : 0;

  return { total, purchased, pending, percentage };
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  addFromRecipe,
  getUserShoppingList,
  togglePurchased,
  removeItem,
  clearPurchased,
  clearAll,
  getStats,
};
