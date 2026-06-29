require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');

// Load Models
const Ingredient = require('../src/models/Ingredient');
const Recipe = require('../src/models/Recipe');
const RecipeNutrition = require('../src/models/RecipeNutrition');
const RecipeIngredient = require('../src/models/RecipeIngredient');
const RecipeStep = require('../src/models/RecipeStep');

async function seedRecipes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected!');

    // 1. Create Ingredients
    console.log('Creating Ingredients...');
    const ingredientsData = [
      { _id: new mongoose.Types.ObjectId().toString(), name: 'Oats', unit: 'g', calories_per_unit: 3.89, protein: 0.17, fat: 0.07, carbs: 0.66 },
      { _id: new mongoose.Types.ObjectId().toString(), name: 'Blueberries', unit: 'g', calories_per_unit: 0.57, protein: 0.01, fat: 0.0, carbs: 0.14 },
      { _id: new mongoose.Types.ObjectId().toString(), name: 'Almonds', unit: 'g', calories_per_unit: 5.79, protein: 0.21, fat: 0.5, carbs: 0.22 },
      { _id: new mongoose.Types.ObjectId().toString(), name: 'Eggs', unit: 'item', calories_per_unit: 70, protein: 6, fat: 5, carbs: 0 },
      { _id: new mongoose.Types.ObjectId().toString(), name: 'Spinach', unit: 'g', calories_per_unit: 0.23, protein: 0.03, fat: 0, carbs: 0.04 },
      { _id: new mongoose.Types.ObjectId().toString(), name: 'Feta Cheese', unit: 'g', calories_per_unit: 2.64, protein: 0.14, fat: 0.21, carbs: 0.04 },
      { _id: new mongoose.Types.ObjectId().toString(), name: 'Chicken Breast', unit: 'g', calories_per_unit: 1.65, protein: 0.31, fat: 0.04, carbs: 0 },
      { _id: new mongoose.Types.ObjectId().toString(), name: 'Quinoa', unit: 'g', calories_per_unit: 1.2, protein: 0.04, fat: 0.02, carbs: 0.21 },
      { _id: new mongoose.Types.ObjectId().toString(), name: 'Broccoli', unit: 'g', calories_per_unit: 0.34, protein: 0.03, fat: 0.0, carbs: 0.07 },
      { _id: new mongoose.Types.ObjectId().toString(), name: 'Salmon', unit: 'g', calories_per_unit: 2.08, protein: 0.2, fat: 0.13, carbs: 0 },
      { _id: new mongoose.Types.ObjectId().toString(), name: 'Sweet Potato', unit: 'g', calories_per_unit: 0.86, protein: 0.02, fat: 0.0, carbs: 0.2 },
      { _id: new mongoose.Types.ObjectId().toString(), name: 'Beef (Lean)', unit: 'g', calories_per_unit: 2.5, protein: 0.26, fat: 0.15, carbs: 0 },
      { _id: new mongoose.Types.ObjectId().toString(), name: 'Tofu', unit: 'g', calories_per_unit: 0.76, protein: 0.08, fat: 0.05, carbs: 0.02 },
      { _id: new mongoose.Types.ObjectId().toString(), name: 'Lentils', unit: 'g', calories_per_unit: 1.16, protein: 0.09, fat: 0.0, carbs: 0.2 },
      { _id: new mongoose.Types.ObjectId().toString(), name: 'Avocado', unit: 'g', calories_per_unit: 1.6, protein: 0.02, fat: 0.15, carbs: 0.09 },
      { _id: new mongoose.Types.ObjectId().toString(), name: 'Shrimp', unit: 'g', calories_per_unit: 0.99, protein: 0.24, fat: 0.0, carbs: 0 },
      { _id: new mongoose.Types.ObjectId().toString(), name: 'Whey Protein', unit: 'g', calories_per_unit: 3.75, protein: 0.8, fat: 0.03, carbs: 0.05 },
      { _id: new mongoose.Types.ObjectId().toString(), name: 'Milk', unit: 'ml', calories_per_unit: 0.42, protein: 0.03, fat: 0.01, carbs: 0.05 },
      { _id: new mongoose.Types.ObjectId().toString(), name: 'Greek Yogurt', unit: 'g', calories_per_unit: 0.59, protein: 0.1, fat: 0.0, carbs: 0.04 }
    ];
    await Ingredient.insertMany(ingredientsData);
    
    // Map ingredient names to their IDs
    const ingMap = {};
    ingredientsData.forEach(ing => ingMap[ing.name] = ing._id);

    // 2. Create Recipes
    console.log('Creating Recipes...');
    const recipesData = [
      {
        _id: new mongoose.Types.ObjectId().toString(),
        name: 'Oatmeal with Berries',
        description: 'A healthy and quick breakfast bowl full of fiber.',
        image_url: 'https://images.unsplash.com/photo-1517673132405-a56a62b18caf',
        cooking_time: 10,
        base_servings: 1,
        status: 'published',
        level_cooking: 'easy',
        cooking_step: '1. Wash the berries.\n2. Boil milk and oats.\n3. Mix everything together and serve.'
      },
      {
        _id: new mongoose.Types.ObjectId().toString(),
        name: 'Scrambled Eggs with Spinach',
        description: 'Protein-packed breakfast to start your day right.',
        image_url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8',
        cooking_time: 15,
        base_servings: 1,
        status: 'published',
        level_cooking: 'easy',
        cooking_step: '1. Beat the eggs.\n2. Sauté the spinach.\n3. Scramble everything together with feta cheese.'
      },
      {
        _id: new mongoose.Types.ObjectId().toString(),
        name: 'Grilled Chicken with Quinoa',
        description: 'A lean, muscle-building lunch with complex carbs.',
        image_url: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435',
        cooking_time: 30,
        base_servings: 1,
        status: 'published',
        level_cooking: 'medium',
        cooking_step: '1. Season and grill chicken.\n2. Cook quinoa according to package.\n3. Steam broccoli and serve together.'
      },
      {
        _id: new mongoose.Types.ObjectId().toString(),
        name: 'Baked Salmon & Sweet Potato',
        description: 'Heart-healthy fats and slow-digesting carbs for dinner.',
        image_url: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288',
        cooking_time: 25,
        base_servings: 1,
        status: 'published',
        level_cooking: 'medium',
        cooking_step: '1. Bake salmon at 200C for 15 minutes.\n2. Mash boiled sweet potatoes.\n3. Plate and serve hot.'
      },
      {
        _id: new mongoose.Types.ObjectId().toString(),
        name: 'Tofu & Mixed Greens',
        description: 'Light vegan lunch packed with plant-based protein.',
        image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
        cooking_time: 15,
        base_servings: 1,
        status: 'published',
        level_cooking: 'easy',
        cooking_step: '1. Pan-fry tofu cubes until golden.\n2. Toss mixed greens in light dressing.\n3. Mix and enjoy.'
      },
      {
        _id: new mongoose.Types.ObjectId().toString(),
        name: 'Protein Shake',
        description: 'Quick post-workout recovery shake.',
        image_url: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d',
        cooking_time: 5,
        base_servings: 1,
        status: 'published',
        level_cooking: 'easy',
        cooking_step: '1. Add milk and whey protein to shaker.\n2. Shake vigorously for 30 seconds.'
      },
      {
        _id: new mongoose.Types.ObjectId().toString(),
        name: 'Shrimp and Avocado Salad',
        description: 'Fresh and low-calorie Mediterranean style salad.',
        image_url: 'https://images.unsplash.com/photo-1551248429-40975aa4de74',
        cooking_time: 20,
        base_servings: 1,
        status: 'published',
        level_cooking: 'medium',
        cooking_step: '1. Grill shrimp for 3 minutes per side.\n2. Dice avocado and mix with spinach.\n3. Toss together with vinaigrette.'
      },
      {
        _id: new mongoose.Types.ObjectId().toString(),
        name: 'Lean Beef Stir Fry',
        description: 'High protein dinner with lots of fiber.',
        image_url: 'https://images.unsplash.com/photo-1512058564366-18510be2db19',
        cooking_time: 25,
        base_servings: 2,
        status: 'published',
        level_cooking: 'medium',
        cooking_step: '1. Slice beef thinly and stir fry.\n2. Add broccoli and cook until tender.\n3. Serve hot.'
      },
      {
        _id: new mongoose.Types.ObjectId().toString(),
        name: 'Greek Yogurt Parfait',
        description: 'Delicious snack with high protein and probiotics.',
        image_url: 'https://images.unsplash.com/photo-1488477181946-6428a0291777',
        cooking_time: 5,
        base_servings: 1,
        status: 'published',
        level_cooking: 'easy',
        cooking_step: '1. Layer greek yogurt and blueberries in a glass.\n2. Serve immediately.'
      },
      {
        _id: new mongoose.Types.ObjectId().toString(),
        name: 'Lentil Soup',
        description: 'Comforting, plant-based iron-rich soup.',
        image_url: 'https://images.unsplash.com/photo-1547592180-85f173990554',
        cooking_time: 40,
        base_servings: 4,
        status: 'published',
        level_cooking: 'hard',
        cooking_step: '1. Boil lentils until soft.\n2. Add spinach and simmer.\n3. Season and serve hot.'
      }
    ];
    await Recipe.insertMany(recipesData);
    
    const recMap = {};
    recipesData.forEach(r => recMap[r.name] = r._id);

    // 3. Create Recipe Ingredients & Nutrition
    console.log('Calculating Nutrition and Creating Recipe Ingredients...');
    const recipeIngredientsToInsert = [];
    const recipeNutritionToInsert = [];

    const recipeDefinitions = {
      'Oatmeal with Berries': [
        { ing: 'Oats', qty: 50, unit: 'g' },
        { ing: 'Milk', qty: 150, unit: 'ml' },
        { ing: 'Blueberries', qty: 50, unit: 'g' },
        { ing: 'Almonds', qty: 15, unit: 'g' }
      ],
      'Scrambled Eggs with Spinach': [
        { ing: 'Eggs', qty: 3, unit: 'item' },
        { ing: 'Spinach', qty: 50, unit: 'g' },
        { ing: 'Feta Cheese', qty: 20, unit: 'g' }
      ],
      'Grilled Chicken with Quinoa': [
        { ing: 'Chicken Breast', qty: 200, unit: 'g' },
        { ing: 'Quinoa', qty: 150, unit: 'g' },
        { ing: 'Broccoli', qty: 100, unit: 'g' }
      ],
      'Baked Salmon & Sweet Potato': [
        { ing: 'Salmon', qty: 150, unit: 'g' },
        { ing: 'Sweet Potato', qty: 200, unit: 'g' }
      ],
      'Tofu & Mixed Greens': [
        { ing: 'Tofu', qty: 150, unit: 'g' },
        { ing: 'Spinach', qty: 100, unit: 'g' }
      ],
      'Protein Shake': [
        { ing: 'Whey Protein', qty: 30, unit: 'g' },
        { ing: 'Milk', qty: 250, unit: 'ml' }
      ],
      'Shrimp and Avocado Salad': [
        { ing: 'Shrimp', qty: 150, unit: 'g' },
        { ing: 'Avocado', qty: 100, unit: 'g' },
        { ing: 'Spinach', qty: 50, unit: 'g' }
      ],
      'Lean Beef Stir Fry': [
        { ing: 'Beef (Lean)', qty: 300, unit: 'g' },
        { ing: 'Broccoli', qty: 200, unit: 'g' }
      ],
      'Greek Yogurt Parfait': [
        { ing: 'Greek Yogurt', qty: 150, unit: 'g' },
        { ing: 'Blueberries', qty: 50, unit: 'g' }
      ],
      'Lentil Soup': [
        { ing: 'Lentils', qty: 200, unit: 'g' },
        { ing: 'Spinach', qty: 100, unit: 'g' }
      ]
    };

    for (const [recipeName, ingredients] of Object.entries(recipeDefinitions)) {
      const recipeId = recMap[recipeName];
      let totalCals = 0, totalPro = 0, totalFat = 0, totalCarbs = 0;

      for (const item of ingredients) {
        const ingData = ingredientsData.find(i => i.name === item.ing);
        if (!ingData) continue;
        
        // Calculate macros
        totalCals += ingData.calories_per_unit * item.qty;
        totalPro += ingData.protein * item.qty;
        totalFat += ingData.fat * item.qty;
        totalCarbs += ingData.carbs * item.qty;

        recipeIngredientsToInsert.push({
          _id: new mongoose.Types.ObjectId().toString(),
          recipe_id: recipeId,
          ingredient_id: ingData._id,
          base_quantity: item.qty,
          unit: item.unit
        });
      }

      recipeNutritionToInsert.push({
        _id: new mongoose.Types.ObjectId().toString(),
        recipe_id: recipeId,
        calories: Math.round(totalCals),
        protein: Math.round(totalPro),
        fat: Math.round(totalFat),
        carbs: Math.round(totalCarbs)
      });
    }

    await RecipeIngredient.insertMany(recipeIngredientsToInsert);
    await RecipeNutrition.insertMany(recipeNutritionToInsert);

    console.log('Seed completed successfully! Added 10 new high-quality recipes.');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding recipes:', err);
    process.exit(1);
  }
}

seedRecipes();
