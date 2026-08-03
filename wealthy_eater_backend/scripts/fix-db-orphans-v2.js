/**
 * fix-db-orphans-v2.js
 *
 * Wealthy Eater – Pre-Release Database Cleanup Round 2
 * ─────────────────────────────────────────────────────
 * Fixes all remaining issues found in the second audit run.
 * Safe to re-run (idempotent).
 *
 * Usage: node scripts/fix-db-orphans-v2.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// ── Load all models ───────────────────────────────────────────────────────────
const modelsDir = path.join(__dirname, '../src/models');
fs.readdirSync(modelsDir)
  .filter((f) => f.endsWith('.js'))
  .forEach((f) => require(path.join(modelsDir, f)));

// ── Helpers ───────────────────────────────────────────────────────────────────
let totalDeleted = 0;
let totalPatched = 0;

function header(phase, title) {
  console.log(`\n${'═'.repeat(62)}`);
  console.log(`  PHASE ${phase}: ${title}`);
  console.log('═'.repeat(62));
}
function logDel(label, count) {
  if (count > 0) { console.log(`  🗑️  Deleted  ${count.toString().padStart(3)} document(s) → ${label}`); totalDeleted += count; }
  else              { console.log(`  ✅ Nothing to delete in: ${label}`); }
}
function logPatch(label, count) {
  if (count > 0) { console.log(`  🔧 Patched  ${count.toString().padStart(3)} document(s) → ${label}`); totalPatched += count; }
  else              { console.log(`  ✅ Nothing to patch in: ${label}`); }
}

// ─────────────────────────────────────────────────────────────────────────────
async function fixDbOrphansV2() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  WEALTHY EATER – PRE-RELEASE DB CLEANUP  (Round 2)       ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`  ${new Date().toISOString()}\n`);

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('  ✅ Connected to MongoDB Atlas.\n');

  // ── Model references ──────────────────────────────────────────────────────
  const User               = mongoose.model('User');
  const UserProfile        = mongoose.model('UserProfile');
  const UserDietary        = mongoose.model('UserDietary');
  const Recipe             = mongoose.model('Recipe');
  const Ingredient         = mongoose.model('Ingredient');
  const RecipeIngredient   = mongoose.model('RecipeIngredient');
  const RecipeNutrition    = mongoose.model('RecipeNutrition');
  const MealPlan           = mongoose.model('MealPlan');
  const MealPlanItem       = mongoose.model('MealPlanItem');

  // ── Baseline valid ID sets ────────────────────────────────────────────────
  const validUserIds      = new Set((await User.find({}, '_id')).map((u) => u._id));
  const validIngredientIds = new Set((await Ingredient.find({}, '_id')).map((i) => i._id));
  const validRecipeIds    = new Set((await Recipe.find({}, '_id')).map((r) => r._id));
  const validMealPlanIds  = new Set((await MealPlan.find({}, '_id')).map((mp) => mp._id));

  // ══════════════════════════════════════════════════════════════
  // PHASE 1: Delete orphan UserProfile
  // ══════════════════════════════════════════════════════════════
  header(1, 'Delete Orphan UserProfile');

  const allProfiles  = await UserProfile.find({}, 'user_id');
  const orphanProfIds = allProfiles
    .filter((p) => !validUserIds.has(p.user_id))
    .map((p) => p._id);

  const r1 = await UserProfile.deleteMany({ _id: { $in: orphanProfIds } });
  logDel('UserProfile (orphan user_id)', r1.deletedCount);

  // ══════════════════════════════════════════════════════════════
  // PHASE 2: Delete orphan UserDietary
  // ══════════════════════════════════════════════════════════════
  header(2, 'Delete Orphan UserDietary');

  const allDietaries = await UserDietary.find({}, 'user_id');
  const orphanDietIds = allDietaries
    .filter((d) => !validUserIds.has(d.user_id))
    .map((d) => d._id);

  const r2 = await UserDietary.deleteMany({ _id: { $in: orphanDietIds } });
  logDel('UserDietary (orphan user_id)', r2.deletedCount);

  // ══════════════════════════════════════════════════════════════
  // PHASE 3: Clean invalid allergy IDs from UserDietary.allergies
  // ══════════════════════════════════════════════════════════════
  header(3, 'Clean Invalid Allergy Ingredient IDs');

  const allDietariesFull = await UserDietary.find({ allergies: { $exists: true, $ne: [] } });
  let allergyPatchCount  = 0;

  for (const d of allDietariesFull) {
    const original    = d.allergies || [];
    const cleaned     = original.filter((id) => validIngredientIds.has(id));
    const removedCount = original.length - cleaned.length;

    if (removedCount > 0) {
      await UserDietary.findByIdAndUpdate(d._id, { $set: { allergies: cleaned } });
      console.log(`  🔧 UserDietary ${d._id}: removed ${removedCount} invalid allergy ID(s)`);
      allergyPatchCount++;
      totalPatched++;
    }
  }

  // Also clean dislike_ingredients
  const allDietariesDislike = await UserDietary.find({
    dislike_ingredients: { $exists: true, $ne: [] },
  });
  let dislikePatchCount = 0;

  for (const d of allDietariesDislike) {
    const original    = d.dislike_ingredients || [];
    const cleaned     = original.filter((id) => validIngredientIds.has(id));
    const removedCount = original.length - cleaned.length;

    if (removedCount > 0) {
      await UserDietary.findByIdAndUpdate(d._id, {
        $set: { dislike_ingredients: cleaned },
      });
      dislikePatchCount++;
      totalPatched++;
    }
  }

  if (allergyPatchCount === 0 && dislikePatchCount === 0) {
    console.log('  ✅ No invalid allergy/dislike IDs found.');
  } else {
    console.log(`  ℹ️  Patched allergies in ${allergyPatchCount} record(s), dislikes in ${dislikePatchCount} record(s).`);
  }

  // ══════════════════════════════════════════════════════════════
  // PHASE 4: Delete orphan MealPlans + their Items
  // ══════════════════════════════════════════════════════════════
  header(4, 'Delete Orphan MealPlans (invalid user_id)');

  const allMealPlans   = await MealPlan.find({}, 'user_id');
  const orphanMPs      = allMealPlans.filter((mp) => !validUserIds.has(mp.user_id));
  const orphanMPIds    = orphanMPs.map((mp) => mp._id);

  console.log(`  Found ${orphanMPIds.length} orphan MealPlan(s).`);

  if (orphanMPIds.length > 0) {
    // Delete items first
    const r4a = await MealPlanItem.deleteMany({ meal_plan_id: { $in: orphanMPIds } });
    logDel('MealPlanItem (of orphan MealPlan)', r4a.deletedCount);

    const r4b = await MealPlan.deleteMany({ _id: { $in: orphanMPIds } });
    logDel('MealPlan (orphan user_id)', r4b.deletedCount);
  }

  // ══════════════════════════════════════════════════════════════
  // PHASE 5: Delete orphan RecipeIngredient records
  // ══════════════════════════════════════════════════════════════
  header(5, 'Delete Orphan RecipeIngredient records');

  const allRIs = await RecipeIngredient.find({});
  const orphanRIIds = allRIs
    .filter(
      (ri) =>
        !validRecipeIds.has(ri.recipe_id) ||
        !validIngredientIds.has(ri.ingredient_id)
    )
    .map((ri) => ri._id);

  const r5 = await RecipeIngredient.deleteMany({ _id: { $in: orphanRIIds } });
  logDel('RecipeIngredient (orphan recipe or ingredient)', r5.deletedCount);

  // ══════════════════════════════════════════════════════════════
  // PHASE 6: Publish unpublished recipes
  // ══════════════════════════════════════════════════════════════
  header(6, 'Publish Draft Recipes');

  const unpublishedRecipes = await Recipe.find({ status: { $ne: 'published' } });
  console.log(`  Found ${unpublishedRecipes.length} unpublished recipe(s):`);

  let publishedCount = 0;
  for (const r of unpublishedRecipes) {
    const hasIngredients = await RecipeIngredient.countDocuments({ recipe_id: r._id });
    const hasNutrition   = await RecipeNutrition.exists({ recipe_id: r._id });

    if (hasIngredients > 0 && hasNutrition) {
      // Recipe has data → safe to publish
      await Recipe.findByIdAndUpdate(r._id, { $set: { status: 'published' } });
      console.log(`  📢 Published: "${r.name}"`);
      publishedCount++;
      totalPatched++;
    } else {
      // Recipe is empty → delete it
      await Recipe.findByIdAndDelete(r._id);
      console.log(`  🗑️  Deleted empty draft recipe: "${r.name}"`);
      totalDeleted++;
    }
  }
  if (unpublishedRecipes.length === 0) console.log('  ✅ All recipes are published.');

  // ══════════════════════════════════════════════════════════════
  // PHASE 7: Delete corrupt MealPlanItems
  //          (undefined/null meal_plan_id OR missing meal_type)
  // ══════════════════════════════════════════════════════════════
  header(7, 'Delete Corrupt MealPlanItem records');

  // Re-compute valid MealPlan IDs after Phase 4 deletion
  const validMPIdsNow = new Set(
    (await MealPlan.find({}, '_id')).map((mp) => mp._id)
  );

  const allMPIs = await MealPlanItem.find({});
  const corruptMPIIds = allMPIs
    .filter(
      (item) =>
        !item.meal_plan_id ||
        item.meal_plan_id === 'undefined' ||
        !validMPIdsNow.has(item.meal_plan_id)
    )
    .map((item) => item._id);

  const r7 = await MealPlanItem.deleteMany({ _id: { $in: corruptMPIIds } });
  logDel('MealPlanItem (null/orphan meal_plan_id)', r7.deletedCount);

  // ══════════════════════════════════════════════════════════════
  // PHASE 8: Fix egg/protein ingredient nutrition data
  //          Any ingredient with calories_per_unit > 500 is suspect
  // ══════════════════════════════════════════════════════════════
  header(8, 'Fix Ingredient Nutrition Outliers');

  // Egg-type ingredients (per item, should be ~70 kcal)
  const EGG_STANDARD = { calories_per_unit: 70, protein: 6, fat: 5, carbs: 0.5 };
  const eggIngredients = await Ingredient.find({
    name: { $regex: /^egg/i },
    calories_per_unit: { $gt: 500 },
  });

  let ingredientFixCount = 0;
  for (const ing of eggIngredients) {
    console.log(`  🔧 Fixing "${ing.name}": calories_per_unit ${ing.calories_per_unit} → 70`);
    await Ingredient.findByIdAndUpdate(ing._id, { $set: EGG_STANDARD });
    ingredientFixCount++;
    totalPatched++;
  }

  if (ingredientFixCount > 0) {
    // Recalculate RecipeNutrition for all recipes that use these egg ingredients
    const eggIngIds = eggIngredients.map((i) => i._id);
    const affectedRIs = await RecipeIngredient.find({
      ingredient_id: { $in: eggIngIds },
    });
    const affectedRecipeIds = [...new Set(affectedRIs.map((ri) => ri.recipe_id))];

    console.log(`  ℹ️  Recalculating nutrition for ${affectedRecipeIds.length} affected recipe(s)...`);
    for (const recipeId of affectedRecipeIds) {
      const ris  = await RecipeIngredient.find({ recipe_id: recipeId });
      let cals = 0, pro = 0, fat = 0, carbs = 0;

      for (const ri of ris) {
        const ing = await Ingredient.findById(ri.ingredient_id);
        if (ing) {
          cals  += (ing.calories_per_unit || 0) * ri.base_quantity;
          pro   += (ing.protein || 0)           * ri.base_quantity;
          fat   += (ing.fat || 0)               * ri.base_quantity;
          carbs += (ing.carbs || 0)             * ri.base_quantity;
        }
      }

      await RecipeNutrition.findOneAndUpdate(
        { recipe_id: recipeId },
        { $set: {
            calories: Math.round(cals * 100) / 100,
            protein:  Math.round(pro  * 100) / 100,
            fat:      Math.round(fat  * 100) / 100,
            carbs:    Math.round(carbs* 100) / 100,
        }},
        { upsert: false }
      );
      const recipe = await Recipe.findById(recipeId);
      console.log(`    ✔ Recalculated: "${recipe ? recipe.name : recipeId}" → ${Math.round(cals)} kcal`);
      totalPatched++;
    }
  } else {
    console.log('  ✅ No outlier ingredient nutrition found.');
  }

  // ══════════════════════════════════════════════════════════════
  // PHASE 9: Self-Verification
  // ══════════════════════════════════════════════════════════════
  header(9, 'Self-Verification');

  let selfCritical = 0;
  let selfError    = 0;

  const fValidUserIds       = new Set((await User.find({}, '_id')).map((u) => u._id));
  const fValidContractIds   = new Set(
    mongoose.modelNames().includes('ConsultationContract')
      ? (await mongoose.model('ConsultationContract').find({}, '_id')).map((c) => c._id)
      : []
  );
  const fValidRecipeIds     = new Set((await Recipe.find({}, '_id')).map((r) => r._id));
  const fValidMPIds         = new Set((await MealPlan.find({}, '_id')).map((mp) => mp._id));
  const fValidIngredientIds = new Set((await Ingredient.find({}, '_id')).map((i) => i._id));

  // UserProfile orphans
  const fProfiles = await UserProfile.find({}, 'user_id');
  for (const p of fProfiles) {
    if (!fValidUserIds.has(p.user_id)) {
      console.log(`  🔴 STILL: Orphan UserProfile ${p._id}`); selfCritical++;
    }
  }

  // UserDietary orphans
  const fDietaries = await UserDietary.find({});
  for (const d of fDietaries) {
    if (!fValidUserIds.has(d.user_id)) {
      console.log(`  🟠 STILL: Orphan UserDietary ${d._id}`); selfError++;
    }
    const badAllergies = (d.allergies || []).filter((id) => !fValidIngredientIds.has(id));
    if (badAllergies.length > 0) {
      console.log(`  🔴 STILL: ${badAllergies.length} bad allergy ID(s) in UserDietary ${d._id}`); selfCritical++;
    }
  }

  // MealPlan orphans
  const fMPs = await MealPlan.find({}, 'user_id');
  for (const mp of fMPs) {
    if (!fValidUserIds.has(mp.user_id)) {
      console.log(`  🔴 STILL: Orphan MealPlan ${mp._id}`); selfCritical++;
    }
  }

  // MealPlanItem orphans
  const fMPIs = await MealPlanItem.find({});
  for (const item of fMPIs) {
    if (!item.meal_plan_id || !fValidMPIds.has(item.meal_plan_id)) {
      console.log(`  🟠 STILL: Orphan MealPlanItem ${item._id}`); selfError++;
    }
    if (item.recipe_id && item.recipe_id !== 'AI_GENERATED' && !fValidRecipeIds.has(item.recipe_id)) {
      console.log(`  🟠 STILL: MealPlanItem ${item._id} bad recipe_id`); selfError++;
    }
  }

  // RecipeIngredient orphans
  const fRIs = await RecipeIngredient.find({});
  for (const ri of fRIs) {
    if (!fValidRecipeIds.has(ri.recipe_id)) {
      console.log(`  🟠 STILL: Orphan RecipeIngredient ${ri._id} (recipe)`); selfError++;
    }
    if (!fValidIngredientIds.has(ri.ingredient_id)) {
      console.log(`  🔴 STILL: Orphan RecipeIngredient ${ri._id} (ingredient)`); selfCritical++;
    }
  }

  // Egg ingredients still suspicious
  const badEggs = await Ingredient.find({
    name: { $regex: /^egg/i },
    calories_per_unit: { $gt: 500 },
  });
  if (badEggs.length > 0) {
    console.log(`  🟠 STILL: ${badEggs.length} egg ingredient(s) with suspicious calories`); selfError++;
  }

  if (selfCritical === 0 && selfError === 0) {
    console.log('  ✅ All integrity checks passed!');
  }

  // ══════════════════════════════════════════════════════════════
  // SUMMARY
  // ══════════════════════════════════════════════════════════════
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║                  CLEANUP SUMMARY                        ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`  Documents deleted : ${totalDeleted}`);
  console.log(`  Documents patched : ${totalPatched}`);
  console.log('');

  if (selfCritical === 0 && selfError === 0) {
    console.log('  🚀 RESULT: ALL CLEAR');
    console.log('  Now run: node scripts/audit-full-db.js to confirm.\n');
    process.exit(0);
  } else {
    console.log(`  ⚠️  RESULT: ${selfCritical} CRITICAL, ${selfError} ERROR remain.`);
    console.log('  Run: node scripts/audit-full-db.js for details.\n');
    process.exit(1);
  }
}

fixDbOrphansV2().catch((err) => {
  console.error('\nFatal error:', err.message);
  process.exit(1);
});
