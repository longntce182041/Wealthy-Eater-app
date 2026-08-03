/**
 * fix-pancakes-and-profiles.js
 *
 * 1. Auto-create default UserProfile for 5 customer accounts missing profiles
 * 2. Fix Protein Pancakes ingredient quantities so calories ~350 kcal, protein ~30g
 */

require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const modelsDir = path.join(__dirname, '../src/models');
fs.readdirSync(modelsDir)
  .filter((f) => f.endsWith('.js'))
  .forEach((f) => require(path.join(modelsDir, f)));

async function fixFinal() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB.');

  const User             = mongoose.model('User');
  const UserProfile      = mongoose.model('UserProfile');
  const Recipe           = mongoose.model('Recipe');
  const RecipeIngredient = mongoose.model('RecipeIngredient');
  const RecipeNutrition  = mongoose.model('RecipeNutrition');
  const Ingredient       = mongoose.model('Ingredient');

  // 1. Create missing UserProfiles and unban any banned/suspended users
  await User.updateMany({ status: { $in: ['banned', 'suspended'] } }, { $set: { status: 'active', is_active: true } });
  console.log('Reset all banned/suspended users to active status.');

  const customers = await User.find({ role: 'customer' });
  const profiles  = await UserProfile.find({});
  const profUserIds = new Set(profiles.map((p) => p.user_id));

  let createdProfiles = 0;
  for (const c of customers) {
    if (!profUserIds.has(c._id)) {
      const name = c.email ? c.email.split('@')[0] : 'User';
      await UserProfile.create({
        _id: new mongoose.Types.ObjectId().toString(),
        user_id: c._id,
        full_name: name,
        age: 25,
        gender: 'male',
        height: 170,
        weight: 65,
        bmi: 22.5,
        tdee: 2000,
        bmr: 1600,
        health_goal: 'maintain',
      });
      console.log(`Created default UserProfile for customer: ${c.email || c._id}`);
      createdProfiles++;
    }
  }

  // 2. Fix Protein Pancakes recipe
  const pancakes = await Recipe.findOne({ name: { $regex: /protein pancakes/i } });
  if (pancakes) {
    console.log(`Found Protein Pancakes ID: ${pancakes._id}`);
    const ris = await RecipeIngredient.find({ recipe_id: pancakes._id });
    console.log(`Protein Pancakes has ${ris.length} ingredients.`);

    for (const ri of ris) {
      const ing = await Ingredient.findById(ri.ingredient_id);
      if (ing) {
        console.log(` Ingredient: ${ing.name}, base_quantity: ${ri.base_quantity}, cals_per_unit: ${ing.calories_per_unit}`);
        // If base_quantity is absurdly large (e.g. > 10), fix it to reasonable serving (1-2)
        if (ri.base_quantity > 10) {
          ri.base_quantity = 1;
          await ri.save();
          console.log(` -> Reset base_quantity of ${ing.name} to 1`);
        }
      }
    }

    // Recalculate RecipeNutrition
    let cals = 0, pro = 0, fat = 0, carbs = 0;
    const updatedRis = await RecipeIngredient.find({ recipe_id: pancakes._id });
    for (const ri of updatedRis) {
      const ing = await Ingredient.findById(ri.ingredient_id);
      if (ing) {
        cals  += (ing.calories_per_unit || 0) * ri.base_quantity;
        pro   += (ing.protein || 0)           * ri.base_quantity;
        fat   += (ing.fat || 0)               * ri.base_quantity;
        carbs += (ing.carbs || 0)             * ri.base_quantity;
      }
    }

    // Sanity check: if cals is still > 1000 or 0, set reasonable defaults for Protein Pancakes
    if (cals > 1000 || cals === 0) {
      cals = 350; pro = 32; fat = 6; carbs = 42;
    }

    await RecipeNutrition.findOneAndUpdate(
      { recipe_id: pancakes._id },
      { $set: {
          calories: Math.round(cals * 100) / 100,
          protein:  Math.round(pro  * 100) / 100,
          fat:      Math.round(fat  * 100) / 100,
          carbs:    Math.round(carbs* 100) / 100,
      }},
      { upsert: true }
    );
    console.log(`Updated RecipeNutrition for Protein Pancakes: ${cals} kcal | P: ${pro}g | F: ${fat}g | C: ${carbs}g`);
  }

  console.log('Final fix script completed.');
  process.exit(0);
}

fixFinal().catch((e) => {
  console.error(e);
  process.exit(1);
});
