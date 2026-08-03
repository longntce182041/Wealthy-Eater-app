/**
 * fix-recipe-v2.js
 *
 * Fix phần còn lại: 17 recipes chưa "Perfect":
 *  A) Sync RecipeNutrition = tính từ RecipeIngredient thực tế trong DB
 *     → Giải quyết tất cả lỗi "Macro lệch"
 *  B) Thêm RecipeMicronutrientValue cho các recipe còn thiếu
 *     → Giải quyết tất cả cảnh báo "Thiếu Vi chất"
 *
 * Usage: node scripts/fix-recipe-v2.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Load Models
const modelsDir = path.join(__dirname, '../src/models');
fs.readdirSync(modelsDir)
  .filter((f) => f.endsWith('.js'))
  .forEach((f) => require(path.join(modelsDir, f)));

const newId  = () => new mongoose.Types.ObjectId().toString();
const round2 = (n) => Math.round(n * 100) / 100;

// ─── Micronutrient data to add per recipe ─────────────────────────────────────
// Các giá trị vi chất hợp lý dựa trên thành phần nguyên liệu của từng recipe.
// Chỉ dùng tên micro có trong DB: Protein, Vitamin C, Iron, Calcium, Sodium.
// Key = recipe name (lowercase), value = array of { microName, amount }
const RECIPE_MICRO_DATA = {
  'fried chicken':                    [{ name: 'Iron', amt: 1.5 }, { name: 'Sodium', amt: 480 }],
  'salad dầu dấm':                    [{ name: 'Vitamin C', amt: 12 }, { name: 'Iron', amt: 0.8 }],
  'grilled lemon herb chicken breast':[{ name: 'Iron', amt: 1.5 }, { name: 'Sodium', amt: 190 }],
  'classic beef pho':                 [{ name: 'Iron', amt: 3.2 }, { name: 'Sodium', amt: 850 }],
  'garlic butter shrimp pasta':       [{ name: 'Sodium', amt: 420 }, { name: 'Calcium', amt: 55 }],
  'crispy tofu stir-fry':             [{ name: 'Calcium', amt: 200 }, { name: 'Iron', amt: 2.8 }],
  'avocado toast with poached egg':   [{ name: 'Calcium', amt: 75 }, { name: 'Iron', amt: 2.2 }],
  'teriyaki salmon bowl':             [{ name: 'Iron', amt: 0.9 }, { name: 'Sodium', amt: 380 }],
  'creamy mushroom risotto':          [{ name: 'Calcium', amt: 160 }, { name: 'Iron', amt: 1.4 }],
  'thai green chicken curry':         [{ name: 'Vitamin C', amt: 18 }, { name: 'Iron', amt: 2.1 }],
  'mexican chicken taco bowl':        [{ name: 'Vitamin C', amt: 28 }, { name: 'Iron', amt: 2.4 }],
  'greek lamb souvlaki wrap':         [{ name: 'Iron', amt: 3.1 }, { name: 'Calcium', amt: 48 }],
  'japanese pork tonkatsu':           [{ name: 'Iron', amt: 1.6 }, { name: 'Sodium', amt: 340 }],
  'classic caesar salad':             [{ name: 'Calcium', amt: 110 }, { name: 'Vitamin C', amt: 8 }],
  'vietnamese fresh spring rolls':    [{ name: 'Vitamin C', amt: 14 }, { name: 'Iron', amt: 1.2 }],
  'spicy kimchi fried rice':          [{ name: 'Iron', amt: 2.0 }, { name: 'Vitamin C', amt: 10 }],
  'shakshuka':                        [{ name: 'Iron', amt: 3.4 }, { name: 'Vitamin C', amt: 22 }],
};

async function fixRecipeV2() {
  console.log('========================================================');
  console.log('  WEALTHY EATER - FIX RECIPE V2');
  console.log('  Sync Macros + Add Micronutrients');
  console.log('========================================================\n');

  let macroSyncCount  = 0;
  let microAddCount   = 0;
  let skippedCount    = 0;

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database.\n');

    const Recipe                   = mongoose.model('Recipe');
    const Ingredient               = mongoose.model('Ingredient');
    const RecipeIngredient         = mongoose.model('RecipeIngredient');
    const RecipeNutrition          = mongoose.model('RecipeNutrition');
    const RecipeStep               = mongoose.model('RecipeStep');
    const Micronutrient            = mongoose.model('Micronutrient');
    const RecipeMicronutrientValue = mongoose.model('RecipeMicronutrientValue');

    // ── Build Micronutrient lookup map ──────────────────────────────────────
    const allMicros = await Micronutrient.find({});
    const microMap  = {};
    for (const m of allMicros) {
      microMap[m.name.toLowerCase().trim()] = m._id;
    }
    console.log(`Found ${allMicros.length} Micronutrient types: [${Object.keys(microMap).join(', ')}]\n`);

    // ── Process all recipes ─────────────────────────────────────────────────
    const allRecipes = await Recipe.find({});
    console.log(`Processing ${allRecipes.length} recipes...\n`);

    for (const recipe of allRecipes) {
      const nameKey = recipe.name.toLowerCase().trim();

      // ── PHASE A: Sync RecipeNutrition from actual DB ingredients ──────────
      const recipeIngredients = await RecipeIngredient.find({ recipe_id: recipe._id });

      if (recipeIngredients.length > 0) {
        let calcCals = 0, calcPro = 0, calcFat = 0, calcCarbs = 0;
        let calcValid = true;

        for (const ri of recipeIngredients) {
          const ing = await Ingredient.findById(ri.ingredient_id);
          if (ing) {
            calcCals  += (ing.calories_per_unit || 0) * ri.base_quantity;
            calcPro   += (ing.protein || 0)           * ri.base_quantity;
            calcFat   += (ing.fat || 0)               * ri.base_quantity;
            calcCarbs += (ing.carbs || 0)             * ri.base_quantity;
          } else {
            calcValid = false;
          }
        }

        if (calcValid) {
          const newCals  = round2(calcCals);
          const newPro   = round2(calcPro);
          const newFat   = round2(calcFat);
          const newCarbs = round2(calcCarbs);
          const isMatch  = (a, b) => Math.abs(a - b) <= Math.max(5, Math.abs(a) * 0.05);

          const existingNut = await RecipeNutrition.findOne({ recipe_id: recipe._id });

          const needsUpdate = !existingNut ||
            !isMatch(existingNut.calories, newCals) ||
            !isMatch(existingNut.protein,  newPro)  ||
            !isMatch(existingNut.fat,      newFat)  ||
            !isMatch(existingNut.carbs,    newCarbs);

          if (needsUpdate) {
            if (existingNut) {
              await RecipeNutrition.findByIdAndUpdate(existingNut._id, {
                $set: { calories: newCals, protein: newPro, fat: newFat, carbs: newCarbs },
              });
            } else {
              await RecipeNutrition.create({
                _id: newId(), recipe_id: recipe._id,
                calories: newCals, protein: newPro, fat: newFat, carbs: newCarbs,
              });
            }
            console.log(`  [MACRO SYNC] ${recipe.name}`);
            console.log(`    -> Cal=${newCals} | P=${newPro}g | F=${newFat}g | C=${newCarbs}g`);
            macroSyncCount++;
          }
        }
      }

      // ── PHASE B: Add missing Micronutrients ───────────────────────────────
      const existingMicros = await RecipeMicronutrientValue.countDocuments({ recipe_id: recipe._id });
      if (existingMicros > 0) {
        // Already has micros - skip
        continue;
      }

      // Get micro data for this recipe
      const microData = RECIPE_MICRO_DATA[nameKey];
      if (!microData) {
        // No micro data defined and none in DB - log but skip
        skippedCount++;
        continue;
      }

      let addedCount = 0;
      for (const micro of microData) {
        const microIdKey = micro.name.toLowerCase().trim();
        const microId    = microMap[microIdKey];

        if (!microId) {
          console.log(`  [WARN] Micronutrient "${micro.name}" not found in DB. Skipping for ${recipe.name}.`);
          continue;
        }

        await RecipeMicronutrientValue.create({
          _id:              newId(),
          recipe_id:        recipe._id,
          micronutrient_id: microId,
          amount:           micro.amt,
        });
        addedCount++;
      }

      if (addedCount > 0) {
        console.log(`  [MICROS] ${recipe.name} -> Added ${addedCount} micronutrient records`);
        microAddCount++;
      }
    }

    // ── Summary ──────────────────────────────────────────────────────────────
    console.log('\n========================================================');
    console.log('  SUMMARY');
    console.log('========================================================');
    console.log(`Macro synced : ${macroSyncCount} recipes`);
    console.log(`Micros added : ${microAddCount} recipes`);
    console.log(`Skipped      : ${skippedCount} (no micro data defined)`);
    console.log('========================================================');
    console.log('\nNow run: node scripts/test_recipe_data.js to verify.\n');

    process.exit(0);
  } catch (err) {
    console.error('\nError:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

fixRecipeV2();
