require('dotenv').config();
const mongoose = require('mongoose');
const Recipe = require('../src/models/Recipe');
const RecipeStep = require('../src/models/RecipeStep');

async function updateRecipes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB.');

    // 1. Update status and level_cooking
    await Recipe.updateMany(
      { status: 'active' },
      { $set: { status: 'published' } }
    );
    
    await Recipe.updateMany(
      { level_cooking: 'Easy' },
      { $set: { level_cooking: 'easy' } }
    );
    
    await Recipe.updateMany(
      { level_cooking: 'Medium' },
      { $set: { level_cooking: 'medium' } }
    );

    await Recipe.updateMany(
      { level_cooking: 'Hard' },
      { $set: { level_cooking: 'hard' } }
    );

    // 2. Fetch all recently seeded recipes (the ones without cooking_step)
    const recipesToUpdate = await Recipe.find({ cooking_step: { $exists: false } });
    
    for (const recipe of recipesToUpdate) {
      // Find the associated steps we created earlier
      const steps = await RecipeStep.find({ recipe_id: recipe._id }).sort({ step_number: 1 });
      if (steps && steps.length > 0) {
        const stepString = steps.map(s => `${s.step_number}. ${s.instruction}`).join('\n');
        recipe.cooking_step = stepString;
        await recipe.save();
      }
    }

    console.log(`Updated ${recipesToUpdate.length} recipes to match the required schema formats (published, easy/medium, cooking_step string).`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

updateRecipes();
