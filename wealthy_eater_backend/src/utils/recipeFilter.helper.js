/**
 * recipeFilter.helper.js
 *
 * Pure filtering function for recipe eligibility based on user constraints.
 *
 * DESIGN PRINCIPLES:
 * - Pure function: no DB calls, no side effects, fully unit-testable.
 * - Single source of truth: used by BOTH Luồng 1 (recipe-based plan) and
 *   Luồng 2 (ingredient pool filtering).
 * - Union exclusion logic: a recipe is excluded if ANY of its ingredients:
 *     a) has _id in bannedIngredientIds (allergy / dislike), OR
 *     b) has any health_tag in bannedTags (medical condition exclusion)
 *
 * DATA COVERAGE WARNING:
 * If `bannedTags` is non-empty but NO ingredient in the pool has any matching
 * health_tag, the medical condition filter effectively has no data to work
 * with. The function signals this via `dataCoverageWarning: true` in the
 * return value — callers MUST surface this to the nutritionist.
 */

'use strict';

/**
 * @typedef {Object} RecipeIngredientEntry
 * @property {string}   ingredientId  — the ingredient's _id (String)
 * @property {string[]} health_tags   — e.g. ["HIGH_SUGAR", "HIGH_GI"]
 */

/**
 * @typedef {Object} FilterResult
 * @property {Object[]} eligibleRecipes    — recipes that passed all filters
 * @property {boolean}  dataCoverageWarning — true if medical tags exist but
 *                                            no ingredients in the pool have
 *                                            matching tags (filter has no data)
 */

/**
 * Filters a list of recipes to those eligible for a user with given constraints.
 *
 * @param {Object}   options
 * @param {Object[]} options.recipes                — full recipe objects (must have `_id`)
 * @param {Set<string>} options.bannedIngredientIds — Set of ingredient _id Strings (allergy + dislike)
 * @param {Set<string>} options.bannedTags          — Set of health_tag Strings (from medical condition)
 * @param {Map<string, RecipeIngredientEntry[]>} options.recipeIngredientMap
 *   Map from recipe._id (String) → array of { ingredientId, health_tags }
 *   for that recipe's ingredients. Pre-fetched by caller.
 * @returns {FilterResult}
 */
function filterEligibleRecipes({ recipes, bannedIngredientIds, bannedTags, recipeIngredientMap }) {
  // ── Data Coverage Warning Check ──────────────────────────────────────────
  // If banned tags are specified but NO ingredient in the pool has matching
  // tags, the medical filter has no data — warn the nutritionist.
  let dataCoverageWarning = false;

  if (bannedTags && bannedTags.size > 0) {
    // Collect all health_tags across all ingredients in all recipes
    let anyIngredientHasMatchingTag = false;
    for (const [, ingredients] of recipeIngredientMap) {
      for (const ing of ingredients) {
        if (ing.health_tags && ing.health_tags.some(tag => bannedTags.has(tag))) {
          anyIngredientHasMatchingTag = true;
          break;
        }
      }
      if (anyIngredientHasMatchingTag) break;
    }
    if (!anyIngredientHasMatchingTag) {
      dataCoverageWarning = true;
    }
  }

  // ── Recipe Filter Loop ───────────────────────────────────────────────────
  const eligibleRecipes = [];

  for (const recipe of recipes) {
    const recipeId = recipe._id?.toString() ?? recipe._id;
    const ingredients = recipeIngredientMap.get(recipeId) ?? [];

    let excluded = false;

    for (const ing of ingredients) {
      const ingId = ing.ingredientId?.toString() ?? ing.ingredientId;

      // Rule A: ingredient is in allergy / dislike list
      if (bannedIngredientIds && bannedIngredientIds.has(ingId)) {
        excluded = true;
        break;
      }

      // Rule B: ingredient has a health_tag that matches the medical condition's exclusion list
      if (bannedTags && bannedTags.size > 0 && ing.health_tags) {
        for (const tag of ing.health_tags) {
          if (bannedTags.has(tag)) {
            excluded = true;
            break;
          }
        }
      }

      if (excluded) break;
    }

    if (!excluded) {
      eligibleRecipes.push(recipe);
    }
  }

  return { eligibleRecipes, dataCoverageWarning };
}

/**
 * Convenience: filters a flat list of ingredient objects
 * (used for Luồng 2 — ingredient pool filtering).
 *
 * @param {Object[]} ingredients  — each must have { _id, health_tags }
 * @param {Set<string>} bannedIngredientIds
 * @param {Set<string>} bannedTags
 * @returns {{ eligibleIngredients: Object[], dataCoverageWarning: boolean }}
 */
function filterEligibleIngredients({ ingredients, bannedIngredientIds, bannedTags }) {
  let dataCoverageWarning = false;

  if (bannedTags && bannedTags.size > 0) {
    const anyHasTag = ingredients.some(
      ing => ing.health_tags && ing.health_tags.some(tag => bannedTags.has(tag))
    );
    if (!anyHasTag) dataCoverageWarning = true;
  }

  const eligibleIngredients = ingredients.filter(ing => {
    const ingId = ing._id?.toString() ?? ing._id;

    if (bannedIngredientIds && bannedIngredientIds.has(ingId)) return false;

    if (bannedTags && bannedTags.size > 0 && ing.health_tags) {
      if (ing.health_tags.some(tag => bannedTags.has(tag))) return false;
    }

    return true;
  });

  return { eligibleIngredients, dataCoverageWarning };
}

module.exports = { filterEligibleRecipes, filterEligibleIngredients };
