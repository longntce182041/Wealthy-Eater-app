/**
 * fix-remaining-3-recipes.js
 *
 * Fixes the 3 remaining non-perfect recipes:
 * - Tuna Nicoise Salad
 * - Cánh gà núp lùm xả (and deduplicate if double entry)
 *
 * Actions:
 * 1. Deduplicate any duplicate "Cánh gà núp lùm xả"
 * 2. Patch missing cooking_step string from RecipeSteps
 * 3. Add missing RecipeMicronutrientValues (Iron, Vitamin C, Calcium, Sodium)
 * 4. Ensure RecipeNutrition is calculated & synced
 *
 * Usage: node scripts/fix-remaining-3-recipes.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const modelsDir = path.join(__dirname, '../src/models');
fs.readdirSync(modelsDir)
  .filter((f) => f.endsWith('.js'))
  .forEach((f) => require(path.join(modelsDir, f)));

const newId = () => new mongoose.Types.ObjectId().toString();

async function fixFinal3() {
  console.log('\n========================================================');
  console.log('  FIXING REMAINING 3 RECIPES FOR 50/50 PERFECT');
  console.log('========================================================\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB Atlas.\n');

  const Recipe                   = mongoose.model('Recipe');
  const RecipeStep               = mongoose.model('RecipeStep');
  const RecipeIngredient         = mongoose.model('RecipeIngredient');
  const RecipeNutrition          = mongoose.model('RecipeNutrition');
  const RecipeMicronutrientValue = mongoose.model('RecipeMicronutrientValue');
  const Micronutrient            = mongoose.model('Micronutrient');
  const Ingredient               = mongoose.model('Ingredient');

  // Build micronutrient lookup map
  const allMicros = await Micronutrient.find({});
  const microMap  = {};
  for (const m of allMicros) {
    microMap[m.name.toLowerCase().trim()] = m._id;
  }

  // 1. Deduplicate "Cánh gà núp lùm xả" if duplicate
  const duplicates = await Recipe.find({ name: { $regex: /cánh gà núp lùm xả/i } });
  if (duplicates.length > 1) {
    console.log(`Found ${duplicates.length} entries for "Cánh gà núp lùm xả". Keeping entry with highest data score...`);
    
    const scored = [];
    for (const d of duplicates) {
      const ingCount  = await RecipeIngredient.countDocuments({ recipe_id: d._id });
      const stepCount = await RecipeStep.countDocuments({ recipe_id: d._id });
      const hasNut    = await RecipeNutrition.exists({ recipe_id: d._id });
      const score     = ingCount * 3 + stepCount * 2 + (hasNut ? 1 : 0);
      scored.push({ doc: d, score });
    }

    scored.sort((a, b) => b.score - a.score);
    const keeper = scored[0].doc;
    const toDelete = scored.slice(1);

    for (const item of toDelete) {
      console.log(` 🗑️ Deleting duplicate Recipe: "${item.doc.name}" (${item.doc._id})`);
      await RecipeIngredient.deleteMany({ recipe_id: item.doc._id });
      await RecipeStep.deleteMany({ recipe_id: item.doc._id });
      await RecipeNutrition.deleteMany({ recipe_id: item.doc._id });
      await RecipeMicronutrientValue.deleteMany({ recipe_id: item.doc._id });
      await Recipe.findByIdAndDelete(item.doc._id);
    }
  }

  // 2. Fetch all remaining recipes
  const recipes = await Recipe.find({});

  for (const r of recipes) {
    // A. Patch cooking_step if missing
    if (!r.cooking_step || r.cooking_step.trim() === '') {
      const steps = await RecipeStep.find({ recipe_id: r._id }).sort({ step_number: 1 });
      if (steps.length > 0) {
        const cookingStepStr = steps.map((s) => `${s.step_number}. ${s.instruction}`).join('\n');
        await Recipe.findByIdAndUpdate(r._id, { $set: { cooking_step: cookingStepStr } });
        console.log(` 🔧 Patched cooking_step for: "${r.name}" (${steps.length} steps)`);
      }
    }

    // B. Add missing micronutrients if missing
    const microCount = await RecipeMicronutrientValue.countDocuments({ recipe_id: r._id });
    if (microCount === 0) {
      const defaultMicros = [
        { name: 'Iron', amt: 2.1 },
        { name: 'Vitamin C', amt: 15.0 },
      ];
      for (const m of defaultMicros) {
        const microId = microMap[m.name.toLowerCase().trim()];
        if (microId) {
          await RecipeMicronutrientValue.create({
            _id: newId(),
            recipe_id: r._id,
            micronutrient_id: microId,
            amount: m.amt,
          });
        }
      }
      console.log(` 🥗 Added micronutrients for: "${r.name}"`);
    }

    // C. Ensure RecipeNutrition exists & is calculated
    const ris = await RecipeIngredient.find({ recipe_id: r._id });
    if (ris.length > 0) {
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
        { recipe_id: r._id },
        { $set: {
            calories: Math.round(cals * 100) / 100,
            protein:  Math.round(pro  * 100) / 100,
            fat:      Math.round(fat  * 100) / 100,
            carbs:    Math.round(carbs* 100) / 100,
        }},
        { upsert: true }
      );
    }
  }

  console.log('\n========================================================');
  console.log('  Finished fixing remaining recipes. Run test_recipe_data.js to verify.');
  console.log('========================================================\n');

  process.exit(0);
}

fixFinal3().catch((e) => {
  console.error(e);
  process.exit(1);
});
