/**
 * recalibrate-recipe-portions.js
 *
 * Wealthy Eater – Data Science Recipe Nutrition Recalibration
 * ─────────────────────────────────────────────────────────────
 * Recalibrates unrealistic recipe portion sizes and macros to match
 * real-world USDA / MyFitnessPal nutritional standards.
 *
 * Usage: node scripts/recalibrate-recipe-portions.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const modelsDir = path.join(__dirname, '../src/models');
fs.readdirSync(modelsDir)
  .filter((f) => f.endsWith('.js'))
  .forEach((f) => require(path.join(modelsDir, f)));

// Standard realistic values for recipes with corrupted or uncalibrated seed data
const REALISTIC_RECIPE_STANDARDS = {
  'avocado toast with poached egg':   { calories: 420,  protein: 18, fat: 22, carbs: 36 },
  'fried chicken':                    { calories: 320,  protein: 26, fat: 18, carbs: 14 },
  'protein pancakes':                 { calories: 380,  protein: 34, fat: 7,  carbs: 45 },
  'spicy kimchi fried rice':          { calories: 480,  protein: 18, fat: 14, carbs: 68 },
  'vietnamese fresh spring rolls':    { calories: 310,  protein: 16, fat: 5,  carbs: 48 },
  'salad dầu dấm':                    { calories: 160,  protein: 3,  fat: 12, carbs: 10 },
};

async function recalibratePortions() {
  console.log('\n========================================================');
  console.log('  WEALTHY EATER – RECIPE NUTRITION RECALIBRATION');
  console.log('========================================================\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB Atlas.\n');

  const Recipe           = mongoose.model('Recipe');
  const RecipeNutrition  = mongoose.model('RecipeNutrition');
  const RecipeIngredient = mongoose.model('RecipeIngredient');

  let updatedCount = 0;

  for (const [recipeName, targetMacros] of Object.entries(REALISTIC_RECIPE_STANDARDS)) {
    const recipe = await Recipe.findOne({ name: { $regex: new RegExp(`^${recipeName}$`, 'i') } });
    
    if (recipe) {
      // 1. Update RecipeNutrition
      await RecipeNutrition.findOneAndUpdate(
        { recipe_id: recipe._id },
        { $set: targetMacros },
        { upsert: true }
      );

      // 2. Adjust RecipeIngredient base_quantity if any ingredient has absurd quantity (> 10)
      const ris = await RecipeIngredient.find({ recipe_id: recipe._id });
      for (const ri of ris) {
        if (ri.base_quantity > 10) {
          ri.base_quantity = 1;
          await ri.save();
        }
      }

      console.log(`  ✅ Recalibrated: "${recipe.name.padEnd(35)}" → ${targetMacros.calories} kcal | P: ${targetMacros.protein}g | F: ${targetMacros.fat}g | C: ${targetMacros.carbs}g`);
      updatedCount++;
    } else {
      console.log(`  ⚠️  Recipe not found: "${recipeName}"`);
    }
  }

  console.log(`\n========================================================`);
  console.log(`  Recalibrated ${updatedCount} recipes to real-world USDA standards.`);
  console.log(`========================================================\n`);

  process.exit(0);
}

recalibratePortions().catch((e) => {
  console.error(e);
  process.exit(1);
});
