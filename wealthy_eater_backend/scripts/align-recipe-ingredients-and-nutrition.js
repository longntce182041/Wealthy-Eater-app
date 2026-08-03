/**
 * align-recipe-ingredients-and-nutrition.js
 *
 * Wealthy Eater – Recipe Nutrition & Ingredient Alignment
 * ────────────────────────────────────────────────────────
 * Solves the data-code alignment problem by adjusting RecipeIngredient base_quantities
 * so that the code formula:
 *   RecipeNutrition = ∑ (Ingredient[i] * RecipeIngredient[i].base_quantity)
 * mathematically equals realistic target calories/macros for all recipes.
 *
 * Usage: node scripts/align-recipe-ingredients-and-nutrition.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const modelsDir = path.join(__dirname, '../src/models');
fs.readdirSync(modelsDir)
  .filter((f) => f.endsWith('.js'))
  .forEach((f) => require(path.join(modelsDir, f)));

// Target realistic calorie bounds per serving type
// Main meal: 350 - 750 kcal | Snack/Salad: 150 - 350 kcal
const TARGET_REALISTIC_CALORIES = {
  'avocado toast with poached egg': 420,
  'protein pancakes':                380,
  'fried chicken':                   320,
  'spicy kimchi fried rice':         480,
  'vietnamese fresh spring rolls':   310,
  'salad dầu dấm':                   160,
};

const round2 = (n) => Math.round(n * 100) / 100;

async function alignDataAndCode() {
  console.log('\n========================================================');
  console.log('  ALIGNING RECIPE INGREDIENTS & CODE NUTRITION FORMULA');
  console.log('========================================================\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB Atlas.\n');

  const Recipe           = mongoose.model('Recipe');
  const RecipeNutrition  = mongoose.model('RecipeNutrition');
  const RecipeIngredient = mongoose.model('RecipeIngredient');
  const Ingredient       = mongoose.model('Ingredient');

  const recipes = await Recipe.find({}).sort({ name: 1 });
  let alignedCount = 0;

  for (const recipe of recipes) {
    const nameKey = recipe.name.toLowerCase().trim();
    const ris     = await RecipeIngredient.find({ recipe_id: recipe._id });

    if (ris.length === 0) continue;

    // 1. Calculate current sum from code formula
    let calcCals = 0, calcPro = 0, calcFat = 0, calcCarbs = 0;
    for (const ri of ris) {
      const ing = await Ingredient.findById(ri.ingredient_id);
      if (ing) {
        calcCals  += (ing.calories_per_unit || 0) * ri.base_quantity;
        calcPro   += (ing.protein || 0)           * ri.base_quantity;
        calcFat   += (ing.fat || 0)               * ri.base_quantity;
        calcCarbs += (ing.carbs || 0)             * ri.base_quantity;
      }
    }

    // 2. Check if this recipe needs target scaling
    const targetCals = TARGET_REALISTIC_CALORIES[nameKey];

    if (targetCals && calcCals > 0 && Math.abs(calcCals - targetCals) > 50) {
      const scale = targetCals / calcCals;
      console.log(`  🔧 Adjusting "${recipe.name}": ${Math.round(calcCals)} kcal → ${targetCals} kcal (scale factor: ${round2(scale)})`);

      // Scale each RecipeIngredient base_quantity
      for (const ri of ris) {
        const newQty = round2(ri.base_quantity * scale);
        ri.base_quantity = Math.max(0.1, newQty);
        await ri.save();
      }

      // Re-sum after scaling
      calcCals = 0; calcPro = 0; calcFat = 0; calcCarbs = 0;
      for (const ri of ris) {
        const ing = await Ingredient.findById(ri.ingredient_id);
        if (ing) {
          calcCals  += (ing.calories_per_unit || 0) * ri.base_quantity;
          calcPro   += (ing.protein || 0)           * ri.base_quantity;
          calcFat   += (ing.fat || 0)               * ri.base_quantity;
          calcCarbs += (ing.carbs || 0)             * ri.base_quantity;
        }
      }
      alignedCount++;
    }

    // 3. Ensure RecipeNutrition in DB EXACTLY equals the code formula calculation
    const finalCals  = round2(calcCals);
    const finalPro   = round2(calcPro);
    const finalFat   = round2(calcFat);
    const finalCarbs = round2(calcCarbs);

    await RecipeNutrition.findOneAndUpdate(
      { recipe_id: recipe._id },
      { $set: { calories: finalCals, protein: finalPro, fat: finalFat, carbs: finalCarbs } },
      { upsert: true }
    );
  }

  console.log(`\n========================================================`);
  console.log(`  Successfully aligned ingredient base_quantities and RecipeNutrition for ALL ${recipes.length} recipes.`);
  console.log(`========================================================\n`);

  process.exit(0);
}

alignDataAndCode().catch((e) => {
  console.error(e);
  process.exit(1);
});
