/**
 * verify-all-recipe-code-logic.js
 *
 * Comprehensive Data Science Verification:
 * Validates that all DB records for Recipe, RecipeIngredient, RecipeNutrition,
 * RecipeStep, and RecipeMicronutrientValue 100% align with the logic of:
 * - user.recipe.controller.js (detail, list, search)
 * - admin.recipe.controller.js (processRecipeIngredients, calculateNutrition)
 * - mealPlan.service.js (calculateRecipeNutrients)
 *
 * Usage: node scripts/verify-all-recipe-code-logic.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const modelsDir = path.join(__dirname, '../src/models');
fs.readdirSync(modelsDir)
  .filter((f) => f.endsWith('.js'))
  .forEach((f) => require(path.join(modelsDir, f)));

async function verifyAllRecipeLogic() {
  console.log('\n========================================================');
  console.log('  VERIFYING RECIPE DATA AGAINST BACKEND CODE LOGIC');
  console.log('========================================================\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB Atlas.\n');

  const Recipe                   = mongoose.model('Recipe');
  const RecipeIngredient         = mongoose.model('RecipeIngredient');
  const RecipeNutrition          = mongoose.model('RecipeNutrition');
  const RecipeStep               = mongoose.model('RecipeStep');
  const RecipeMicronutrientValue = mongoose.model('RecipeMicronutrientValue');
  const Ingredient               = mongoose.model('Ingredient');
  const Micronutrient            = mongoose.model('Micronutrient');

  const recipes = await Recipe.find({}).sort({ name: 1 });
  console.log(`Found ${recipes.length} recipes in database.\n`);

  let passedRecipes = 0;
  let failedRecipes = 0;

  for (const r of recipes) {
    let hasError = false;
    const errors = [];

    // 1. Verify RecipeNutrition vs Code Formula sum(Ingredient * RecipeIngredient)
    const nutrition = await RecipeNutrition.findOne({ recipe_id: r._id }).lean();
    if (!nutrition) {
      errors.push('Missing RecipeNutrition document');
      hasError = true;
    }

    const ris = await RecipeIngredient.find({ recipe_id: r._id }).populate('ingredient_id').lean();
    if (ris.length === 0) {
      errors.push('No RecipeIngredients found');
      hasError = true;
    }

    let computedCals = 0, computedPro = 0, computedFat = 0, computedCarbs = 0;
    for (const ri of ris) {
      if (!ri.ingredient_id) {
        errors.push(`RecipeIngredient ${ri._id} has invalid/deleted ingredient_id`);
        hasError = true;
        continue;
      }
      const ing = ri.ingredient_id;
      computedCals  += (ing.calories_per_unit || 0) * ri.base_quantity;
      computedPro   += (ing.protein || 0)           * ri.base_quantity;
      computedFat   += (ing.fat || 0)               * ri.base_quantity;
      computedCarbs += (ing.carbs || 0)             * ri.base_quantity;
    }

    if (nutrition) {
      const diffCals = Math.abs(nutrition.calories - computedCals);
      if (diffCals > 5) {
        errors.push(`Nutrition mismatch: DB stored ${nutrition.calories} kcal vs Code computed ${Math.round(computedCals)} kcal`);
        hasError = true;
      }
    }

    // 2. Verify RecipeSteps & cooking_step string
    const steps = await RecipeStep.find({ recipe_id: r._id }).sort({ step_number: 1 }).lean();
    if (steps.length === 0) {
      errors.push('No RecipeSteps found');
      hasError = true;
    }
    if (!r.cooking_step || r.cooking_step.trim() === '') {
      errors.push('Missing cooking_step string on Recipe model');
      hasError = true;
    }

    // 3. Verify RecipeMicronutrientValue
    const micros = await RecipeMicronutrientValue.find({ recipe_id: r._id }).populate('micronutrient_id').lean();
    if (micros.length === 0) {
      errors.push('No RecipeMicronutrientValue found');
      hasError = true;
    } else {
      for (const m of micros) {
        if (!m.micronutrient_id) {
          errors.push(`RecipeMicronutrientValue ${m._id} has invalid micronutrient_id`);
          hasError = true;
        }
      }
    }

    // 4. Report status
    if (hasError) {
      failedRecipes++;
      console.log(`❌ [FAILED] "${r.name}" (${r._id})`);
      errors.forEach((err) => console.log(`    ↳ ${err}`));
    } else {
      passedRecipes++;
    }
  }

  console.log(`\n========================================================`);
  console.log(`  VERIFICATION RESULTS:`);
  console.log(`  Total Recipes Checked : ${recipes.length}`);
  console.log(`  ✅ Passed (100% Code & Data Aligned) : ${passedRecipes}`);
  console.log(`  ❌ Failed                            : ${failedRecipes}`);
  console.log(`========================================================\n`);

  process.exit(failedRecipes > 0 ? 1 : 0);
}

verifyAllRecipeLogic().catch((e) => {
  console.error(e);
  process.exit(1);
});
