require('dotenv').config();
const mongoose = require('mongoose');

// Import all related models
const Recipe = require('../src/models/Recipe');
const Ingredient = require('../src/models/Ingredient');
const RecipeIngredient = require('../src/models/RecipeIngredient');
const RecipeNutrition = require('../src/models/RecipeNutrition');
const RecipeStep = require('../src/models/RecipeStep');
const Micronutrient = require('../src/models/Micronutrient');
const RecipeMicronutrientValue = require('../src/models/RecipeMicronutrientValue');

async function seedPerfectRecipe() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB.');

    // 1. Create the base Recipe
    const recipeId = new mongoose.Types.ObjectId().toString();
    
    // We provide `cooking_step` as a string for backward compatibility / quick UI access,
    // but we will also populate the RecipeStep collection for relational strictness.
    const cookingStepString = `1. Rinse quinoa and cook with water until fluffy.
2. Season salmon with salt, pepper, and olive oil.
3. Air-fry or bake salmon at 200°C for 12 minutes.
4. Slice avocado and cherry tomatoes.
5. Assemble the bowl: Quinoa base, salmon on top, surrounded by avocado and tomatoes. Drizzle with lemon juice.`;

    const masterRecipe = new Recipe({
      _id: recipeId,
      name: 'Ultimate Avocado Salmon Quinoa Bowl',
      description: 'A nutritionally perfect bowl packed with Omega-3s, lean protein, and complex carbohydrates. Ideal for muscle recovery and heart health.',
      image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
      cooking_time: 25,
      base_servings: 1,
      status: 'published',
      level_cooking: 'medium',
      cooking_step: cookingStepString
    });
    
    await masterRecipe.save();
    console.log('✅ Created Recipe:', masterRecipe.name);

    // 2. Create Ingredients
    const salmonId = new mongoose.Types.ObjectId().toString();
    const quinoaId = new mongoose.Types.ObjectId().toString();
    const avocadoId = new mongoose.Types.ObjectId().toString();
    
    await Ingredient.insertMany([
      { _id: salmonId, name: 'Premium Atlantic Salmon', unit: 'g', calories_per_unit: 2.08, protein: 0.2, fat: 0.13, carbs: 0, description: 'Rich in Omega-3 fatty acids.' },
      { _id: quinoaId, name: 'Organic White Quinoa', unit: 'g', calories_per_unit: 1.2, protein: 0.04, fat: 0.02, carbs: 0.21, description: 'A complete protein grain.' },
      { _id: avocadoId, name: 'Hass Avocado', unit: 'g', calories_per_unit: 1.6, protein: 0.02, fat: 0.15, carbs: 0.09, description: 'Excellent source of healthy monounsaturated fats.' }
    ]);
    console.log('✅ Created Ingredients (Salmon, Quinoa, Avocado)');

    // 3. Create RecipeIngredient mappings
    await RecipeIngredient.insertMany([
      { _id: new mongoose.Types.ObjectId().toString(), recipe_id: recipeId, ingredient_id: salmonId, base_quantity: 150, unit: 'g' },
      { _id: new mongoose.Types.ObjectId().toString(), recipe_id: recipeId, ingredient_id: quinoaId, base_quantity: 100, unit: 'g' },
      { _id: new mongoose.Types.ObjectId().toString(), recipe_id: recipeId, ingredient_id: avocadoId, base_quantity: 50, unit: 'g' }
    ]);
    console.log('✅ Created RecipeIngredient mappings');

    // 4. Create RecipeNutrition (Macros)
    // Calc: Salmon(312 kcal, 30P, 19.5F, 0C) + Quinoa(120 kcal, 4P, 2F, 21C) + Avocado(80 kcal, 1P, 7.5F, 4.5C)
    // Totals: 512 kcal, 35P, 29F, 25.5C
    await RecipeNutrition.create({
      _id: new mongoose.Types.ObjectId().toString(),
      recipe_id: recipeId,
      calories: 512,
      protein: 35,
      fat: 29,
      carbs: 26
    });
    console.log('✅ Created RecipeNutrition (Macros)');

    // 5. Create RecipeSteps (Relational Steps)
    await RecipeStep.insertMany([
      { _id: new mongoose.Types.ObjectId().toString(), recipe_id: recipeId, step_number: 1, instruction: 'Rinse quinoa and cook with water until fluffy.' },
      { _id: new mongoose.Types.ObjectId().toString(), recipe_id: recipeId, step_number: 2, instruction: 'Season salmon with salt, pepper, and olive oil.' },
      { _id: new mongoose.Types.ObjectId().toString(), recipe_id: recipeId, step_number: 3, instruction: 'Air-fry or bake salmon at 200°C for 12 minutes.' },
      { _id: new mongoose.Types.ObjectId().toString(), recipe_id: recipeId, step_number: 4, instruction: 'Slice avocado and cherry tomatoes.' },
      { _id: new mongoose.Types.ObjectId().toString(), recipe_id: recipeId, step_number: 5, instruction: 'Assemble the bowl: Quinoa base, salmon on top, surrounded by avocado and tomatoes. Drizzle with lemon juice.' }
    ]);
    console.log('✅ Created RecipeSteps (1 to 5)');

    // 6. Create Micronutrients & RecipeMicronutrientValue
    const vitaminD_Id = new mongoose.Types.ObjectId().toString();
    const iron_Id = new mongoose.Types.ObjectId().toString();

    await Micronutrient.insertMany([
      { _id: vitaminD_Id, name: 'Vitamin D', unit: 'IU', description: 'Crucial for bone health and immune function.' },
      { _id: iron_Id, name: 'Iron', unit: 'mg', description: 'Vital for blood production and oxygen transport.' }
    ]);

    await RecipeMicronutrientValue.insertMany([
      { _id: new mongoose.Types.ObjectId().toString(), recipe_id: recipeId, micronutrient_id: vitaminD_Id, amount: 600 }, // Salmon is high in Vit D
      { _id: new mongoose.Types.ObjectId().toString(), recipe_id: recipeId, micronutrient_id: iron_Id, amount: 4.5 } // Quinoa has good Iron
    ]);
    console.log('✅ Created Micronutrients & Mappings (Vitamin D, Iron)');

    console.log('\n🎉 Perfect Recipe Data successfully seeded! This represents a 100% complete relational graph for AI Meal Planning.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seedPerfectRecipe();
