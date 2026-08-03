/**
 * fix-recipe-db.js
 *
 * Script sửa toàn bộ lỗ hổng dữ liệu Recipe trong database Wealthy Eater.
 * Dựa trên kết quả audit: 52 recipes, chỉ 11 Perfect, 41 cần sửa.
 *
 * 4 Giai đoạn:
 *  1. Inventory & Dedup        – Xóa recipe trùng tên, build lookup maps
 *  2. Fix cooking_step string  – Ghép RecipeStep thành chuỗi, patch Recipe document
 *  3. Fix Orphan & Macro       – Xóa RecipeIngredient orphan, recalculate RecipeNutrition
 *  4. Populate recipe rỗng     – Bổ sung đầy đủ Ingredients, Steps, Nutrition
 *
 * Usage: node scripts/fix-recipe-db.js
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

const newId = () => new mongoose.Types.ObjectId().toString();
const round2 = (n) => Math.round(n * 100) / 100;

// ─── Master Recipe Data ────────────────────────────────────────────────────────
// Dữ liệu đầy đủ cho các recipe cần populate.
// calories_per_unit: calories PER GRAM (hoặc per item nếu unit='item').
// Nguồn: USDA FoodData Central.
const RECIPE_DATA_TO_POPULATE = [
  {
    name: 'Classic Beef Pho',
    description: 'A traditional Vietnamese beef noodle soup with aromatic spices, slow-simmered broth, and fresh herbs.',
    image_url: 'https://images.unsplash.com/photo-1576577445504-6af96477db52?auto=format&fit=crop&q=80&w=600',
    cooking_time: 120,
    base_servings: 2,
    level_cooking: 'hard',
    ingredients: [
      { name: 'Beef Brisket', unit: 'g', cals: 2.71, pro: 0.17, fat: 0.22, carbs: 0, qty: 200 },
      { name: 'Rice Noodles', unit: 'g', cals: 1.09, pro: 0.02, fat: 0.002, carbs: 0.25, qty: 150 },
      { name: 'Bean Sprouts', unit: 'g', cals: 0.30, pro: 0.03, fat: 0.002, carbs: 0.06, qty: 80 },
      { name: 'Green Onion', unit: 'g', cals: 0.32, pro: 0.018, fat: 0.002, carbs: 0.07, qty: 30 },
    ],
    steps: [
      'Char the ginger and onion directly on an open flame or in a hot pan until fragrant and slightly blackened.',
      'Blanch the beef brisket in boiling water for 5 minutes, then discard the water to remove impurities.',
      'In a large pot, combine the cleaned beef with 3 liters of fresh water, charred ginger, and onion. Simmer for at least 90 minutes.',
      'Season the broth with fish sauce and salt to taste.',
      'Cook rice noodles separately according to package instructions, then drain.',
      'Thinly slice the cooked beef.',
      'Place noodles in a bowl, top with sliced beef and green onions. Ladle hot broth over everything.',
      'Serve with bean sprouts and fresh herbs on the side.',
    ],
  },
  {
    name: 'Garlic Butter Shrimp Pasta',
    description: 'A quick and indulgent pasta dish with juicy shrimp in a rich garlic butter sauce, ready in under 20 minutes.',
    image_url: 'https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?auto=format&fit=crop&q=80&w=600',
    cooking_time: 20,
    base_servings: 1,
    level_cooking: 'easy',
    ingredients: [
      { name: 'Shrimp', unit: 'g', cals: 0.99, pro: 0.24, fat: 0.003, carbs: 0.001, qty: 150 },
      { name: 'Spaghetti', unit: 'g', cals: 1.58, pro: 0.056, fat: 0.009, carbs: 0.31, qty: 100 },
      { name: 'Butter', unit: 'g', cals: 7.17, pro: 0.009, fat: 0.81, carbs: 0.001, qty: 20 },
      { name: 'Garlic', unit: 'g', cals: 1.49, pro: 0.06, fat: 0.005, carbs: 0.33, qty: 15 },
    ],
    steps: [
      'Cook spaghetti in salted boiling water until al dente (8-10 minutes). Reserve 1/2 cup pasta water before draining.',
      'While pasta cooks, melt butter in a large skillet over medium-high heat.',
      'Add minced garlic and saute for 1 minute until fragrant but not browned.',
      'Add shrimp in a single layer. Cook for 2 minutes per side until pink and curled.',
      'Add drained pasta to the pan and toss to combine.',
      'Add a splash of pasta water to loosen the sauce if needed. Season with salt and pepper.',
      'Serve immediately garnished with fresh parsley.',
    ],
  },
  {
    name: 'Teriyaki Salmon Bowl',
    description: 'Glazed salmon with a sweet and savory teriyaki sauce over fluffy steamed rice.',
    image_url: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&q=80&w=600',
    cooking_time: 25,
    base_servings: 1,
    level_cooking: 'medium',
    ingredients: [
      { name: 'Salmon Fillet', unit: 'g', cals: 2.08, pro: 0.20, fat: 0.13, carbs: 0, qty: 150 },
      { name: 'Jasmine Rice', unit: 'g', cals: 1.30, pro: 0.027, fat: 0.003, carbs: 0.28, qty: 100 },
      { name: 'Teriyaki Sauce', unit: 'g', cals: 1.5, pro: 0.05, fat: 0.001, carbs: 0.30, qty: 40 },
      { name: 'Sesame Seeds', unit: 'g', cals: 5.73, pro: 0.17, fat: 0.50, carbs: 0.23, qty: 5 },
    ],
    steps: [
      'Cook jasmine rice according to package instructions.',
      'Pat the salmon fillet dry with paper towels. Season lightly with salt and pepper.',
      'Heat a non-stick pan over medium-high heat with a little oil.',
      'Place salmon skin-side up and cook for 4 minutes until golden.',
      'Flip the salmon, pour teriyaki sauce over it, and cook for another 3-4 minutes, basting frequently.',
      'Serve salmon over steamed rice, drizzle remaining sauce from the pan on top.',
      'Garnish with sesame seeds and sliced green onions.',
    ],
  },
  {
    name: 'Creamy Mushroom Risotto',
    description: 'A classic Italian comfort dish featuring Arborio rice cooked slowly with a savory mushroom broth and Parmesan cheese.',
    image_url: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?auto=format&fit=crop&q=80&w=600',
    cooking_time: 40,
    base_servings: 2,
    level_cooking: 'medium',
    ingredients: [
      { name: 'Arborio Rice', unit: 'g', cals: 3.60, pro: 0.07, fat: 0.003, carbs: 0.79, qty: 120 },
      { name: 'Button Mushrooms', unit: 'g', cals: 0.22, pro: 0.031, fat: 0.003, carbs: 0.032, qty: 200 },
      { name: 'Parmesan Cheese', unit: 'g', cals: 4.31, pro: 0.38, fat: 0.29, carbs: 0.039, qty: 40 },
      { name: 'Butter', unit: 'g', cals: 7.17, pro: 0.009, fat: 0.81, carbs: 0.001, qty: 20 },
    ],
    steps: [
      'Slice mushrooms and saute in butter over medium-high heat until golden. Set aside.',
      'In the same pan, toast the Arborio rice for 2 minutes until slightly translucent.',
      'Add a ladle of warm vegetable broth and stir constantly until absorbed.',
      'Continue adding broth one ladle at a time, stirring after each addition, for about 20 minutes.',
      'When rice is cooked al dente, stir in the sauteed mushrooms and Parmesan cheese.',
      'Remove from heat, season with salt and pepper, and serve immediately.',
    ],
  },
  {
    name: 'Thai Green Chicken Curry',
    description: 'A fragrant and creamy Thai curry with tender chicken, vibrant green curry paste, and fresh vegetables.',
    image_url: 'https://images.unsplash.com/photo-1455619452474-d2be8b1de6d0?auto=format&fit=crop&q=80&w=600',
    cooking_time: 30,
    base_servings: 2,
    level_cooking: 'medium',
    ingredients: [
      { name: 'Chicken Breast', unit: 'g', cals: 1.65, pro: 0.31, fat: 0.04, carbs: 0, qty: 200 },
      { name: 'Coconut Milk', unit: 'ml', cals: 2.30, pro: 0.023, fat: 0.24, carbs: 0.056, qty: 200 },
      { name: 'Green Curry Paste', unit: 'g', cals: 0.90, pro: 0.04, fat: 0.04, carbs: 0.13, qty: 30 },
      { name: 'Jasmine Rice', unit: 'g', cals: 1.30, pro: 0.027, fat: 0.003, carbs: 0.28, qty: 100 },
    ],
    steps: [
      'Cook jasmine rice according to package instructions.',
      'Heat a tablespoon of oil in a wok or large pan over medium heat.',
      'Add green curry paste and fry for 1-2 minutes until fragrant.',
      'Add diced chicken breast and cook, stirring, until the chicken changes color (about 5 minutes).',
      'Pour in coconut milk and bring to a simmer.',
      'Cook for 10-15 minutes until the chicken is cooked through and the sauce has thickened slightly.',
      'Season with fish sauce and lime juice to taste.',
      'Serve over jasmine rice, garnished with fresh Thai basil.',
    ],
  },
  {
    name: 'Crispy Tofu Stir-Fry',
    description: 'A satisfying vegan dish with golden, crispy tofu and colorful vegetables in a savory garlic sauce.',
    image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=600',
    cooking_time: 25,
    base_servings: 1,
    level_cooking: 'easy',
    ingredients: [
      { name: 'Firm Tofu', unit: 'g', cals: 1.44, pro: 0.16, fat: 0.09, carbs: 0.03, qty: 200 },
      { name: 'Bell Pepper', unit: 'g', cals: 0.20, pro: 0.01, fat: 0.002, carbs: 0.048, qty: 100 },
      { name: 'Broccoli', unit: 'g', cals: 0.34, pro: 0.028, fat: 0.004, carbs: 0.066, qty: 100 },
      { name: 'Soy Sauce', unit: 'ml', cals: 0.53, pro: 0.08, fat: 0.001, carbs: 0.049, qty: 20 },
    ],
    steps: [
      'Press tofu firmly between paper towels for at least 20 minutes to remove excess moisture.',
      'Cut tofu into 2cm cubes.',
      'Heat oil in a pan over high heat. Add tofu and cook undisturbed for 3-4 minutes per side until golden and crispy.',
      'Remove tofu and set aside.',
      'In the same pan, stir-fry broccoli and bell peppers for 3-4 minutes until tender-crisp.',
      'Return the tofu to the pan, add soy sauce and minced garlic.',
      'Toss everything together for 1 minute. Serve immediately over rice or noodles.',
    ],
  },
  {
    name: 'Avocado Toast with Poached Egg',
    description: 'The ultimate nutritious brunch with creamy avocado on toasted bread topped with a perfectly poached egg.',
    image_url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&q=80&w=600',
    cooking_time: 15,
    base_servings: 1,
    level_cooking: 'easy',
    ingredients: [
      { name: 'Avocado', unit: 'g', cals: 1.60, pro: 0.02, fat: 0.15, carbs: 0.085, qty: 100 },
      { name: 'Whole Wheat Bread', unit: 'g', cals: 2.47, pro: 0.13, fat: 0.034, carbs: 0.41, qty: 60 },
      { name: 'Egg', unit: 'item', cals: 70, pro: 6, fat: 5, carbs: 0.4, qty: 2 },
    ],
    steps: [
      'Toast the whole wheat bread until golden brown.',
      'Halve the avocado, remove the pit, and scoop the flesh into a bowl.',
      'Mash the avocado with a fork. Season with salt, pepper, and a squeeze of lemon juice.',
      'To poach the eggs: bring a pot of water to a gentle simmer and add a splash of white vinegar.',
      'Crack each egg into a small cup, create a gentle swirl in the water, and lower the egg in. Cook for 3 minutes.',
      'Spread mashed avocado onto the toast.',
      'Place the poached eggs on top. Season with salt, pepper, and red pepper flakes.',
    ],
  },
  {
    name: 'Grilled Lemon Herb Chicken Breast',
    description: 'Juicy, protein-packed chicken breast marinated in bright lemon and fresh herbs, perfect for any meal plan.',
    image_url: 'https://images.unsplash.com/photo-1432139509613-5c4255815697?auto=format&fit=crop&q=80&w=600',
    cooking_time: 30,
    base_servings: 1,
    level_cooking: 'easy',
    ingredients: [
      { name: 'Chicken Breast', unit: 'g', cals: 1.65, pro: 0.31, fat: 0.04, carbs: 0, qty: 200 },
      { name: 'Lemon', unit: 'g', cals: 0.29, pro: 0.011, fat: 0.003, carbs: 0.09, qty: 50 },
      { name: 'Olive Oil', unit: 'ml', cals: 8.84, pro: 0, fat: 1.0, carbs: 0, qty: 15 },
      { name: 'Garlic', unit: 'g', cals: 1.49, pro: 0.06, fat: 0.005, carbs: 0.33, qty: 10 },
    ],
    steps: [
      'In a bowl, combine lemon juice, olive oil, minced garlic, dried herbs (rosemary, thyme), salt and pepper.',
      'Place chicken breast in the marinade and coat well. Let it marinate for at least 20 minutes (or overnight in the fridge).',
      'Preheat a grill or grill pan to medium-high heat.',
      'Remove chicken from marinade and grill for 6-8 minutes per side.',
      'The chicken is done when internal temperature reaches 75 degrees Celsius (165F).',
      'Let the chicken rest for 5 minutes before slicing to retain juices.',
      'Serve with a side salad or steamed vegetables.',
    ],
  },
];

// ─── Main Fix Function ────────────────────────────────────────────────────────
async function fixRecipeDatabase() {
  console.log('========================================================');
  console.log('  WEALTHY EATER - DATABASE FIX SCRIPT');
  console.log('========================================================\n');

  let dedupCount = 0;
  let stepPatchCount = 0;
  let orphanCount = 0;
  let macroFixCount = 0;
  let populatedCount = 0;

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database.\n');

    const Recipe                   = mongoose.model('Recipe');
    const Ingredient               = mongoose.model('Ingredient');
    const RecipeIngredient         = mongoose.model('RecipeIngredient');
    const RecipeNutrition          = mongoose.model('RecipeNutrition');
    const RecipeStep               = mongoose.model('RecipeStep');
    const RecipeMicronutrientValue = mongoose.model('RecipeMicronutrientValue');

    // ─────────────────────────────────────────────────────────────────────────
    // GIAI DOAN 1: INVENTORY & DEDUP
    // ─────────────────────────────────────────────────────────────────────────
    console.log('----------------------------------------------------------');
    console.log('GIAI DOAN 1: INVENTORY & DEDUP');
    console.log('----------------------------------------------------------');

    // Build ingredient lookup map (name -> document)
    const allIngredients = await Ingredient.find({});
    const ingredientMap = {};
    for (const ing of allIngredients) {
      ingredientMap[ing.name.toLowerCase().trim()] = ing;
    }
    console.log(`Found ${allIngredients.length} Ingredients in DB.`);

    // Detect & remove duplicate recipes (same name)
    const allRecipes = await Recipe.find({});
    const nameGroups = {};
    for (const r of allRecipes) {
      const key = r.name.toLowerCase().trim();
      if (!nameGroups[key]) nameGroups[key] = [];
      nameGroups[key].push(r._id);
    }

    for (const [recipeName, ids] of Object.entries(nameGroups)) {
      if (ids.length <= 1) continue;

      console.log(`\n  DUPLICATE: "${recipeName}" (${ids.length} copies)`);

      // Score each: prefer the one with the most related data
      let bestId = null;
      let bestScore = -1;

      for (const rid of ids) {
        const ingCount  = await RecipeIngredient.countDocuments({ recipe_id: rid });
        const stepCount = await RecipeStep.countDocuments({ recipe_id: rid });
        const nutExists = await RecipeNutrition.exists({ recipe_id: rid });
        const score = ingCount * 3 + stepCount * 2 + (nutExists ? 1 : 0);
        if (score > bestScore) { bestScore = score; bestId = rid; }
      }

      for (const rid of ids) {
        if (rid === bestId) continue;
        await RecipeIngredient.deleteMany({ recipe_id: rid });
        await RecipeStep.deleteMany({ recipe_id: rid });
        await RecipeNutrition.deleteMany({ recipe_id: rid });
        await RecipeMicronutrientValue.deleteMany({ recipe_id: rid });
        await Recipe.findByIdAndDelete(rid);
        console.log(`    Deleted duplicate ID: ${rid}`);
        dedupCount++;
      }
      console.log(`    Kept best copy: ${bestId}`);
    }

    console.log(`\nPhase 1 done: removed ${dedupCount} duplicates.\n`);

    // ─────────────────────────────────────────────────────────────────────────
    // GIAI DOAN 2: FIX COOKING_STEP STRING THIEU
    // ─────────────────────────────────────────────────────────────────────────
    console.log('----------------------------------------------------------');
    console.log('GIAI DOAN 2: FIX COOKING_STEP STRING');
    console.log('----------------------------------------------------------');

    const recipesNow = await Recipe.find({});

    for (const recipe of recipesNow) {
      if (recipe.cooking_step && recipe.cooking_step.trim().length > 10) continue;

      const steps = await RecipeStep.find({ recipe_id: recipe._id }).sort({ step_number: 1 });
      if (steps.length === 0) continue;

      const cookingStepString = steps
        .map((s) => `${s.step_number}. ${s.instruction}`)
        .join('\n');

      await Recipe.findByIdAndUpdate(recipe._id, { $set: { cooking_step: cookingStepString } });
      console.log(`  Fixed cooking_step for: ${recipe.name}`);
      stepPatchCount++;
    }

    console.log(`\nPhase 2 done: patched ${stepPatchCount} recipes.\n`);

    // ─────────────────────────────────────────────────────────────────────────
    // GIAI DOAN 3: FIX ORPHAN INGREDIENTS & RECALCULATE MACRO
    // ─────────────────────────────────────────────────────────────────────────
    console.log('----------------------------------------------------------');
    console.log('GIAI DOAN 3: FIX ORPHAN INGREDIENTS & RECALCULATE MACRO');
    console.log('----------------------------------------------------------');

    const allRecipeIds = (await Recipe.find({}, '_id')).map((r) => r._id);

    for (const recipeId of allRecipeIds) {
      const recipeIngredients = await RecipeIngredient.find({ recipe_id: recipeId });
      if (recipeIngredients.length === 0) continue;

      // Remove orphan RecipeIngredients (pointing to non-existent Ingredient)
      for (const ri of recipeIngredients) {
        const ingExists = await Ingredient.exists({ _id: ri.ingredient_id });
        if (!ingExists) {
          await RecipeIngredient.findByIdAndDelete(ri._id);
          console.log(`  Deleted orphan RecipeIngredient (ingredient_id: ${ri.ingredient_id})`);
          orphanCount++;
        }
      }

      // Recalculate macro from current valid RecipeIngredients
      const validRIs = await RecipeIngredient.find({ recipe_id: recipeId });
      if (validRIs.length === 0) continue;

      let calcCals = 0, calcPro = 0, calcFat = 0, calcCarbs = 0;
      for (const ri of validRIs) {
        const ing = await Ingredient.findById(ri.ingredient_id);
        if (ing) {
          calcCals  += (ing.calories_per_unit || 0) * ri.base_quantity;
          calcPro   += (ing.protein || 0)           * ri.base_quantity;
          calcFat   += (ing.fat || 0)               * ri.base_quantity;
          calcCarbs += (ing.carbs || 0)             * ri.base_quantity;
        }
      }

      const newCals  = round2(calcCals);
      const newPro   = round2(calcPro);
      const newFat   = round2(calcFat);
      const newCarbs = round2(calcCarbs);
      const isMatch  = (a, b) => Math.abs(a - b) <= Math.max(5, a * 0.05);

      const existingNut = await RecipeNutrition.findOne({ recipe_id: recipeId });
      const recipe      = await Recipe.findById(recipeId);
      const recipeName  = recipe ? recipe.name : String(recipeId);

      if (!existingNut) {
        await RecipeNutrition.create({
          _id: newId(), recipe_id: recipeId,
          calories: newCals, protein: newPro, fat: newFat, carbs: newCarbs,
        });
        console.log(`  Created missing RecipeNutrition for: ${recipeName}`);
        macroFixCount++;
      } else if (
        !isMatch(existingNut.calories, newCals) || !isMatch(existingNut.protein, newPro) ||
        !isMatch(existingNut.fat, newFat)        || !isMatch(existingNut.carbs, newCarbs)
      ) {
        await RecipeNutrition.findByIdAndUpdate(existingNut._id, {
          $set: { calories: newCals, protein: newPro, fat: newFat, carbs: newCarbs },
        });
        console.log(`  Fixed Macro for: ${recipeName}`);
        console.log(`    Old: Cal=${existingNut.calories} P=${existingNut.protein} F=${existingNut.fat} C=${existingNut.carbs}`);
        console.log(`    New: Cal=${newCals} P=${newPro} F=${newFat} C=${newCarbs}`);
        macroFixCount++;
      }
    }

    console.log(`\nPhase 3 done: ${orphanCount} orphans removed, ${macroFixCount} macros updated.\n`);

    // ─────────────────────────────────────────────────────────────────────────
    // GIAI DOAN 4: POPULATE RECIPE RONG
    // ─────────────────────────────────────────────────────────────────────────
    console.log('----------------------------------------------------------');
    console.log('GIAI DOAN 4: POPULATE EMPTY RECIPES');
    console.log('----------------------------------------------------------');

    // Refresh ingredient map after potential creates in phase 3
    const freshIngredients = await Ingredient.find({});
    for (const ing of freshIngredients) {
      ingredientMap[ing.name.toLowerCase().trim()] = ing;
    }

    for (const rData of RECIPE_DATA_TO_POPULATE) {
      const escapedName = rData.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const dbRecipe = await Recipe.findOne({ name: { $regex: new RegExp(`^${escapedName}$`, 'i') } });

      if (!dbRecipe) {
        console.log(`  SKIP: "${rData.name}" not found in DB.`);
        continue;
      }

      const existingIngCount = await RecipeIngredient.countDocuments({ recipe_id: dbRecipe._id });
      if (existingIngCount > 0) {
        console.log(`  SKIP: "${rData.name}" already has ${existingIngCount} ingredients.`);
        continue;
      }

      console.log(`\n  Populating: "${rData.name}" (${dbRecipe._id})`);

      // Update Recipe metadata
      await Recipe.findByIdAndUpdate(dbRecipe._id, {
        $set: {
          description: rData.description,
          image_url: rData.image_url,
          cooking_time: rData.cooking_time,
          base_servings: rData.base_servings,
          level_cooking: rData.level_cooking,
          status: 'published',
        },
      });

      let totalCals = 0, totalPro = 0, totalFat = 0, totalCarbs = 0;

      for (const ing of rData.ingredients) {
        const ingKey = ing.name.toLowerCase().trim();
        let dbIng = ingredientMap[ingKey];

        if (!dbIng) {
          dbIng = await Ingredient.findOne({ name: { $regex: new RegExp(`^${ing.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } });
        }

        if (!dbIng) {
          dbIng = await Ingredient.create({
            _id: newId(),
            name: ing.name,
            unit: ing.unit,
            calories_per_unit: ing.cals,
            protein: ing.pro,
            fat: ing.fat,
            carbs: ing.carbs,
            description: `${ing.name} - culinary ingredient`,
          });
          ingredientMap[ingKey] = dbIng;
          console.log(`    Created new Ingredient: ${ing.name}`);
        }

        totalCals  += ing.cals * ing.qty;
        totalPro   += ing.pro  * ing.qty;
        totalFat   += ing.fat  * ing.qty;
        totalCarbs += ing.carbs * ing.qty;

        await RecipeIngredient.create({
          _id: newId(),
          recipe_id: dbRecipe._id,
          ingredient_id: dbIng._id,
          base_quantity: ing.qty,
          unit: ing.unit,
        });
      }

      // Upsert RecipeNutrition
      const existingNut = await RecipeNutrition.findOne({ recipe_id: dbRecipe._id });
      const nutritionData = {
        calories: round2(totalCals),
        protein:  round2(totalPro),
        fat:      round2(totalFat),
        carbs:    round2(totalCarbs),
      };

      if (existingNut) {
        await RecipeNutrition.findByIdAndUpdate(existingNut._id, { $set: nutritionData });
      } else {
        await RecipeNutrition.create({ _id: newId(), recipe_id: dbRecipe._id, ...nutritionData });
      }

      // Create RecipeSteps (clear old partial steps first)
      await RecipeStep.deleteMany({ recipe_id: dbRecipe._id });
      const stepDocs = rData.steps.map((s, idx) => ({
        _id: newId(),
        recipe_id: dbRecipe._id,
        step_number: idx + 1,
        instruction: s,
      }));
      await RecipeStep.insertMany(stepDocs);

      // Update cooking_step string on Recipe document
      const cookingStepString = rData.steps.map((s, idx) => `${idx + 1}. ${s}`).join('\n');
      await Recipe.findByIdAndUpdate(dbRecipe._id, { $set: { cooking_step: cookingStepString } });

      console.log(`    Done: Cal=${round2(totalCals)} | P=${round2(totalPro)}g | F=${round2(totalFat)}g | C=${round2(totalCarbs)}g | Steps=${rData.steps.length}`);
      populatedCount++;
    }

    console.log(`\nPhase 4 done: populated ${populatedCount} recipes.\n`);

    // ─────────────────────────────────────────────────────────────────────────
    // BAO CAO TONG KET
    // ─────────────────────────────────────────────────────────────────────────
    console.log('========================================================');
    console.log('  BAO CAO TONG KET');
    console.log('========================================================');
    console.log(`Deleted ${dedupCount} duplicate recipes`);
    console.log(`Patched ${stepPatchCount} cooking_step strings`);
    console.log(`Removed ${orphanCount} orphan RecipeIngredients`);
    console.log(`Fixed   ${macroFixCount} RecipeNutrition records`);
    console.log(`Populated ${populatedCount} empty recipes with full data`);
    console.log('========================================================');
    console.log('\nNow run: node scripts/test_recipe_data.js to verify.\n');

    process.exit(0);
  } catch (err) {
    console.error('\nError during fix:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

fixRecipeDatabase();
