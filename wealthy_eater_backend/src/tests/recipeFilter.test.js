
/**
 * recipeFilter.test.js
 *
 * Unit tests for filterEligibleRecipes() and filterEligibleIngredients().
 * Pure functions — no DB, no mocking required.
 *
 * Run: node src/tests/recipeFilter.test.js
 */

'use strict';

const { filterEligibleRecipes, filterEligibleIngredients } = require('../utils/recipeFilter.helper');

// ── Test Fixtures ─────────────────────────────────────────────────────────────

const RECIPE_A = { _id: 'r1', name: 'Grilled Chicken' };
const RECIPE_B = { _id: 'r2', name: 'Sugar Cake' };         // has HIGH_SUGAR ingredient
const RECIPE_C = { _id: 'r3', name: 'Salmon Salad' };
const RECIPE_D = { _id: 'r4', name: 'Brown Rice Bowl' };    // has allergen ingredient

const ALL_RECIPES = [RECIPE_A, RECIPE_B, RECIPE_C, RECIPE_D];

// recipeIngredientMap: recipeId → [{ ingredientId, health_tags }]
const RECIPE_INGREDIENT_MAP = new Map([
  ['r1', [
    { ingredientId: 'ing_chicken', health_tags: [] },
    { ingredientId: 'ing_olive_oil', health_tags: [] },
  ]],
  ['r2', [
    { ingredientId: 'ing_sugar', health_tags: ['HIGH_SUGAR', 'HIGH_GI'] },
    { ingredientId: 'ing_flour', health_tags: ['REFINED_CARB'] },
  ]],
  ['r3', [
    { ingredientId: 'ing_salmon', health_tags: [] },
    { ingredientId: 'ing_lettuce', health_tags: [] },
  ]],
  ['r4', [
    { ingredientId: 'ing_brown_rice', health_tags: [] },
    { ingredientId: 'ing_peanut', health_tags: [] },   // peanut allergy
  ]],
]);

// ── Test Runner ───────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

function assertEqual(actual, expected, message) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    console.log(`  ✅ PASS: ${message} (= ${JSON.stringify(actual)})`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    console.error(`     Expected: ${JSON.stringify(expected)}`);
    console.error(`     Actual:   ${JSON.stringify(actual)}`);
    failed++;
  }
}

// ── Case 1: No medical condition → no recipes excluded for medical reasons ────
console.log('\nCase 1: User has no medical condition (bannedTags empty)');
{
  const { eligibleRecipes, dataCoverageWarning } = filterEligibleRecipes({
    recipes: ALL_RECIPES,
    bannedIngredientIds: new Set(),
    bannedTags: new Set(),          // empty = no medical condition
    recipeIngredientMap: RECIPE_INGREDIENT_MAP,
  });

  assertEqual(eligibleRecipes.length, 4, 'All 4 recipes pass when no restrictions');
  assert(dataCoverageWarning === false, 'dataCoverageWarning is false (no banned tags)');
}

// ── Case 2: Type 2 Diabetes → recipe with HIGH_SUGAR excluded ────────────────
console.log('\nCase 2: User has Type 2 Diabetes (bannedTags: HIGH_SUGAR, HIGH_GI, REFINED_CARB)');
{
  const bannedTags = new Set(['HIGH_SUGAR', 'HIGH_GI', 'REFINED_CARB']);
  const { eligibleRecipes, dataCoverageWarning } = filterEligibleRecipes({
    recipes: ALL_RECIPES,
    bannedIngredientIds: new Set(),
    bannedTags,
    recipeIngredientMap: RECIPE_INGREDIENT_MAP,
  });

  const ids = eligibleRecipes.map(r => r._id);
  assert(!ids.includes('r2'), 'Sugar Cake (r2) excluded — contains HIGH_SUGAR ingredient');
  assert(ids.includes('r1'), 'Grilled Chicken (r1) kept — no banned tags');
  assert(ids.includes('r3'), 'Salmon Salad (r3) kept — no banned tags');
  assert(ids.includes('r4'), 'Brown Rice Bowl (r4) kept — no banned tags');
  assertEqual(eligibleRecipes.length, 3, '3 recipes remain after medical filter');
  assert(dataCoverageWarning === false, 'dataCoverageWarning is false (some ingredients DID have matching tags)');
}

// ── Case 3: Ingredient in both allergy AND health_tag exclusion ───────────────
console.log('\nCase 3: Ingredient dual exclusion (allergy + health_tag)');
{
  // RECIPE_B has ing_sugar which is both in allergies AND has HIGH_SUGAR tag
  const bannedIngredientIds = new Set(['ing_sugar']);
  const bannedTags = new Set(['HIGH_SUGAR']);

  const { eligibleRecipes } = filterEligibleRecipes({
    recipes: [RECIPE_A, RECIPE_B],
    bannedIngredientIds,
    bannedTags,
    recipeIngredientMap: RECIPE_INGREDIENT_MAP,
  });

  assertEqual(eligibleRecipes.length, 1, 'Only 1 recipe remains (r2 excluded by allergy)');
  assert(eligibleRecipes[0]._id === 'r1', 'Remaining recipe is Grilled Chicken (r1)');
}

// ── Case 4: No violations → all recipes pass ─────────────────────────────────
console.log('\nCase 4: Recipes with no ingredient violations pass through');
{
  const { eligibleRecipes } = filterEligibleRecipes({
    recipes: [RECIPE_A, RECIPE_C],
    bannedIngredientIds: new Set(['ing_peanut']),
    bannedTags: new Set(['HIGH_SODIUM']),
    recipeIngredientMap: RECIPE_INGREDIENT_MAP,
  });

  assertEqual(eligibleRecipes.length, 2, 'Both recipes pass (no sodium or peanut)');
}

// ── Case 5: dataCoverageWarning when tags defined but no ingredient has them ──
console.log('\nCase 5: data_coverage_warning when no ingredient has matching health_tags');
{
  // r1, r3, r4 — ingredients with empty health_tags
  // bannedTags has HIGH_SODIUM but no ingredient has that tag
  const { eligibleRecipes, dataCoverageWarning } = filterEligibleRecipes({
    recipes: [RECIPE_A, RECIPE_C, RECIPE_D],
    bannedIngredientIds: new Set(),
    bannedTags: new Set(['HIGH_SODIUM']),   // tag not present in any ingredient
    recipeIngredientMap: RECIPE_INGREDIENT_MAP,
  });

  assert(dataCoverageWarning === true, 'dataCoverageWarning is true — no ingredient has HIGH_SODIUM tag');
  assertEqual(eligibleRecipes.length, 3, 'All 3 recipes still pass (no actual exclusions)');
}

// ── Case 6: Allergy excludes recipe even if no banned tags ───────────────────
console.log('\nCase 6: Peanut allergy alone excludes Brown Rice Bowl');
{
  const { eligibleRecipes } = filterEligibleRecipes({
    recipes: ALL_RECIPES,
    bannedIngredientIds: new Set(['ing_peanut']),
    bannedTags: new Set(),
    recipeIngredientMap: RECIPE_INGREDIENT_MAP,
  });

  const ids = eligibleRecipes.map(r => r._id);
  assert(!ids.includes('r4'), 'Brown Rice Bowl (r4) excluded — contains peanut (allergy)');
  assertEqual(eligibleRecipes.length, 3, '3 recipes remain after allergy filter');
}

// ── filterEligibleIngredients test ───────────────────────────────────────────
console.log('\nCase 7: filterEligibleIngredients for Luồng 2 ingredient pool');
{
  const ingredients = [
    { _id: 'ing_chicken', health_tags: [] },
    { _id: 'ing_sugar', health_tags: ['HIGH_SUGAR'] },
    { _id: 'ing_peanut', health_tags: [] },
  ];

  const { eligibleIngredients, dataCoverageWarning } = filterEligibleIngredients({
    ingredients,
    bannedIngredientIds: new Set(['ing_peanut']),
    bannedTags: new Set(['HIGH_SUGAR']),
  });

  assertEqual(eligibleIngredients.length, 1, 'Only chicken passes (sugar=tag banned, peanut=allergy banned)');
  assert(eligibleIngredients[0]._id === 'ing_chicken', 'Remaining ingredient is chicken');
  assert(dataCoverageWarning === false, 'dataCoverageWarning false — ing_sugar DID have HIGH_SUGAR tag');
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error('❌ Some tests FAILED');
  process.exit(1);
} else {
  console.log('✅ All tests PASSED');
}
