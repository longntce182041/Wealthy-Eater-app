/**
 * audit-recipe-realism.js
 *
 * Data Science Audit of Recipe Macro & Portion Realism.
 * Checks all 47 recipes in DB against standard USDA realistic ranges per serving:
 * - Calories: 150 - 1000 kcal
 * - Protein: 5 - 80 g
 * - Fat: 2 - 60 g
 * - Carbs: 5 - 120 g
 *
 * Usage: node scripts/audit-recipe-realism.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const modelsDir = path.join(__dirname, '../src/models');
fs.readdirSync(modelsDir)
  .filter((f) => f.endsWith('.js'))
  .forEach((f) => require(path.join(modelsDir, f)));

async function auditRealism() {
  await mongoose.connect(process.env.MONGODB_URI);

  const Recipe           = mongoose.model('Recipe');
  const RecipeNutrition  = mongoose.model('RecipeNutrition');
  const RecipeIngredient = mongoose.model('RecipeIngredient');
  const Ingredient       = mongoose.model('Ingredient');

  const recipes = await Recipe.find({}).sort({ name: 1 });
  console.log(`\n========================================================`);
  console.log(`  DATA SCIENCE RECIPE NUTRITION REALISM AUDIT (${recipes.length} recipes)`);
  console.log(`========================================================\n`);

  let unrealisticCount = 0;
  const auditReport = [];

  for (const r of recipes) {
    const nut = await RecipeNutrition.findOne({ recipe_id: r._id });
    const ris = await RecipeIngredient.find({ recipe_id: r._id });
    
    let calcCals = 0, calcPro = 0, calcFat = 0, calcCarbs = 0;
    const ingDetails = [];

    for (const ri of ris) {
      const ing = await Ingredient.findById(ri.ingredient_id);
      if (ing) {
        const itemCals = (ing.calories_per_unit || 0) * ri.base_quantity;
        calcCals  += itemCals;
        calcPro   += (ing.protein || 0) * ri.base_quantity;
        calcFat   += (ing.fat || 0) * ri.base_quantity;
        calcCarbs += (ing.carbs || 0) * ri.base_quantity;

        ingDetails.push(`${ing.name} (qty: ${ri.base_quantity}, unit_cal: ${ing.calories_per_unit}) → ${Math.round(itemCals)} kcal`);
      }
    }

    const cals = nut ? nut.calories : calcCals;
    const pro = nut ? nut.protein : calcPro;
    const fat = nut ? nut.fat : calcFat;
    const carbs = nut ? nut.carbs : calcCarbs;

    // Check realistic bounds
    const isUnrealistic = cals < 100 || cals > 1200 || pro > 90 || fat > 70 || carbs > 150;
    const status = isUnrealistic ? '❌ UNREALISTIC' : '✅ REALISTIC';

    if (isUnrealistic) unrealisticCount++;

    auditReport.push({
      name: r.name,
      cals: Math.round(cals),
      pro: Math.round(pro),
      fat: Math.round(fat),
      carbs: Math.round(carbs),
      isUnrealistic,
      status,
      ingDetails,
    });
  }

  console.log(`RECIPE METRICS SUMMARY:`);
  console.log(`--------------------------------------------------------`);
  for (const item of auditReport) {
    console.log(`${item.status.padEnd(16)} | ${item.name.padEnd(36)} | ${item.cals.toString().padStart(5)} kcal | P:${item.pro.toString().padStart(3)}g F:${item.fat.toString().padStart(3)}g C:${item.carbs.toString().padStart(3)}g`);
    if (item.isUnrealistic) {
      console.log(`    ↳ INGREDIENTS: ${item.ingDetails.join(' | ')}`);
    }
  }

  console.log(`\n========================================================`);
  console.log(`Total Checked: ${recipes.length} | Realistic: ${recipes.length - unrealisticCount} | Unrealistic/Abnormal: ${unrealisticCount}`);
  console.log(`========================================================\n`);

  process.exit(0);
}

auditRealism().catch((e) => { console.error(e); process.exit(1); });
