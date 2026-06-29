require('dotenv').config();
const mongoose = require('mongoose');

const Recipe = require('../src/models/Recipe');
const Ingredient = require('../src/models/Ingredient');
const RecipeIngredient = require('../src/models/RecipeIngredient');
const RecipeNutrition = require('../src/models/RecipeNutrition');
const RecipeStep = require('../src/models/RecipeStep');
const Micronutrient = require('../src/models/Micronutrient');
const RecipeMicronutrientValue = require('../src/models/RecipeMicronutrientValue');

async function resetAndSeed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB. 🧹 Đang dọn dẹp dữ liệu cũ (Recipes, Ingredients, Macros, vv)...');

    // 1. Wipe existing recipe-related data to ensure 100% clean slate
    await Recipe.deleteMany({});
    await Ingredient.deleteMany({});
    await RecipeIngredient.deleteMany({});
    await RecipeNutrition.deleteMany({});
    await RecipeStep.deleteMany({});
    await Micronutrient.deleteMany({});
    await RecipeMicronutrientValue.deleteMany({});
    
    console.log('✅ Đã xoá toàn bộ dữ liệu cũ bị lỗi.');

    // 2. Create Micronutrients
    const micros = [
      { _id: new mongoose.Types.ObjectId().toString(), name: 'Vitamin C', unit: 'mg', description: 'Antioxidant and immune support.' },
      { _id: new mongoose.Types.ObjectId().toString(), name: 'Iron', unit: 'mg', description: 'Vital for blood production and oxygen transport.' },
      { _id: new mongoose.Types.ObjectId().toString(), name: 'Calcium', unit: 'mg', description: 'Essential for bone health.' },
      { _id: new mongoose.Types.ObjectId().toString(), name: 'Zinc', unit: 'mg', description: 'Supports immune system and metabolism.' },
      { _id: new mongoose.Types.ObjectId().toString(), name: 'Vitamin B12', unit: 'mcg', description: 'Important for nerve function and energy.' },
      { _id: new mongoose.Types.ObjectId().toString(), name: 'Vitamin D', unit: 'IU', description: 'Crucial for bone health and immune function.' }
    ];
    await Micronutrient.insertMany(micros);
    const microMap = {};
    micros.forEach(m => microMap[m.name] = m._id);

    // 3. Define the 11 Perfect Recipes
    const recipesData = [
      {
        name: 'Ultimate Avocado Salmon Quinoa Bowl',
        description: 'A nutritionally perfect bowl packed with Omega-3s, lean protein, and complex carbohydrates.',
        image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
        cooking_time: 25,
        level_cooking: 'medium',
        ingredients: [
          { name: 'Premium Atlantic Salmon', unit: 'g', cals: 2.08, pro: 0.2, fat: 0.13, carbs: 0, qty: 150 },
          { name: 'Organic White Quinoa', unit: 'g', cals: 1.2, pro: 0.04, fat: 0.02, carbs: 0.21, qty: 100 },
          { name: 'Hass Avocado', unit: 'g', cals: 1.6, pro: 0.02, fat: 0.15, carbs: 0.09, qty: 50 }
        ],
        steps: [
          'Rinse quinoa and cook with water until fluffy.',
          'Season salmon with salt, pepper, and olive oil.',
          'Air-fry or bake salmon at 200°C for 12 minutes.',
          'Slice avocado and cherry tomatoes.',
          'Assemble the bowl: Quinoa base, salmon on top, surrounded by avocado and tomatoes. Drizzle with lemon juice.'
        ],
        micros: [{ name: 'Vitamin D', amount: 600 }, { name: 'Iron', amount: 4.5 }]
      },
      {
        name: 'Mediterranean Grilled Chicken Salad',
        description: 'A refreshing, low-carb salad with Mediterranean flavors.',
        image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd',
        cooking_time: 20,
        level_cooking: 'easy',
        ingredients: [
          { name: 'Chicken Breast', unit: 'g', cals: 1.65, pro: 0.31, fat: 0.04, carbs: 0, qty: 150 },
          { name: 'Spinach', unit: 'g', cals: 0.23, pro: 0.03, fat: 0, carbs: 0.04, qty: 100 },
          { name: 'Feta Cheese', unit: 'g', cals: 2.64, pro: 0.14, fat: 0.21, carbs: 0.04, qty: 30 }
        ],
        steps: [
          'Grill the chicken breast until fully cooked (74°C internal).',
          'Wash and dry the spinach leaves.',
          'Dice the grilled chicken and crumble the feta cheese.',
          'Toss everything in a large bowl with a light vinaigrette.'
        ],
        micros: [{ name: 'Iron', amount: 3.5 }, { name: 'Calcium', amount: 150 }]
      },
      {
        name: 'Vegan Lentil & Sweet Potato Curry',
        description: 'A warm, comforting plant-based dish rich in fiber.',
        image_url: 'https://images.unsplash.com/photo-1547592180-85f173990554',
        cooking_time: 40,
        level_cooking: 'medium',
        ingredients: [
          { name: 'Lentils', unit: 'g', cals: 1.16, pro: 0.09, fat: 0, carbs: 0.2, qty: 150 },
          { name: 'Sweet Potato', unit: 'g', cals: 0.86, pro: 0.02, fat: 0, carbs: 0.2, qty: 200 },
          { name: 'Coconut Milk', unit: 'ml', cals: 1.97, pro: 0.02, fat: 0.21, carbs: 0.03, qty: 100 }
        ],
        steps: [
          'Peel and dice the sweet potatoes.',
          'Boil lentils and sweet potatoes until tender.',
          'Stir in coconut milk and curry spices.',
          'Simmer for 10 minutes until thick and flavorful.'
        ],
        micros: [{ name: 'Iron', amount: 6.0 }, { name: 'Vitamin C', amount: 20 }]
      },
      {
        name: 'High-Protein Turkey Chili',
        description: 'Lean, spicy, and extremely filling for dinner.',
        image_url: 'https://images.unsplash.com/photo-1514326640560-7d063ef2aed5',
        cooking_time: 45,
        level_cooking: 'medium',
        ingredients: [
          { name: 'Lean Ground Turkey', unit: 'g', cals: 1.49, pro: 0.27, fat: 0.08, carbs: 0, qty: 200 },
          { name: 'Kidney Beans', unit: 'g', cals: 1.27, pro: 0.09, fat: 0.01, carbs: 0.23, qty: 150 },
          { name: 'Diced Tomatoes', unit: 'g', cals: 0.18, pro: 0.01, fat: 0, carbs: 0.04, qty: 150 }
        ],
        steps: [
          'Brown the ground turkey in a large pot.',
          'Add diced tomatoes, kidney beans, and chili powder.',
          'Bring to a boil, then reduce heat and simmer for 30 minutes.',
          'Serve hot with a sprinkle of fresh cilantro.'
        ],
        micros: [{ name: 'Zinc', amount: 5.5 }, { name: 'Iron', amount: 4.8 }]
      },
      {
        name: 'Keto Baked Cod with Asparagus',
        description: 'An ultra low-carb, high-protein meal.',
        image_url: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2',
        cooking_time: 20,
        level_cooking: 'easy',
        ingredients: [
          { name: 'Cod Fillet', unit: 'g', cals: 0.82, pro: 0.18, fat: 0.01, carbs: 0, qty: 200 },
          { name: 'Asparagus', unit: 'g', cals: 0.2, pro: 0.02, fat: 0, carbs: 0.04, qty: 150 },
          { name: 'Olive Oil', unit: 'ml', cals: 8.84, pro: 0, fat: 1.0, carbs: 0, qty: 15 }
        ],
        steps: [
          'Preheat oven to 200°C.',
          'Place cod and asparagus on a baking sheet.',
          'Drizzle with olive oil, salt, and lemon zest.',
          'Bake for 12-15 minutes until fish flakes easily.'
        ],
        micros: [{ name: 'Vitamin B12', amount: 2.1 }]
      },
      {
        name: 'Classic Steak and Eggs',
        description: 'The ultimate muscle-building breakfast.',
        image_url: 'https://images.unsplash.com/photo-1600891964092-4316c288032e',
        cooking_time: 15,
        level_cooking: 'medium',
        ingredients: [
          { name: 'Lean Beef Steak', unit: 'g', cals: 2.5, pro: 0.26, fat: 0.15, carbs: 0, qty: 150 },
          { name: 'Eggs', unit: 'item', cals: 70, pro: 6, fat: 5, carbs: 0, qty: 2 }
        ],
        steps: [
          'Season steak with salt and pepper.',
          'Pan-sear the steak to your preferred doneness (about 3-4 mins per side for medium-rare).',
          'In the same pan, fry the eggs sunny-side up.',
          'Serve steak and eggs hot.'
        ],
        micros: [{ name: 'Iron', amount: 4.0 }, { name: 'Vitamin B12', amount: 3.5 }, { name: 'Zinc', amount: 6.2 }]
      },
      {
        name: 'Greek Yogurt & Berry Protein Bowl',
        description: 'A sweet, guilt-free treat loaded with probiotics.',
        image_url: 'https://images.unsplash.com/photo-1488477181946-6428a0291777',
        cooking_time: 5,
        level_cooking: 'easy',
        ingredients: [
          { name: 'Greek Yogurt', unit: 'g', cals: 0.59, pro: 0.1, fat: 0, carbs: 0.04, qty: 200 },
          { name: 'Blueberries', unit: 'g', cals: 0.57, pro: 0.01, fat: 0, carbs: 0.14, qty: 100 },
          { name: 'Almonds', unit: 'g', cals: 5.79, pro: 0.21, fat: 0.5, carbs: 0.22, qty: 20 }
        ],
        steps: [
          'Scoop Greek yogurt into a bowl.',
          'Wash blueberries and scatter them on top.',
          'Roughly chop almonds and sprinkle over the bowl.',
          'Serve immediately.'
        ],
        micros: [{ name: 'Calcium', amount: 220 }, { name: 'Vitamin C', amount: 15 }]
      },
      {
        name: 'Shrimp & Zucchini Noodle Stir-fry',
        description: 'A fantastic low-calorie pasta alternative.',
        image_url: 'https://images.unsplash.com/photo-1551248429-40975aa4de74',
        cooking_time: 15,
        level_cooking: 'easy',
        ingredients: [
          { name: 'Shrimp', unit: 'g', cals: 0.99, pro: 0.24, fat: 0, carbs: 0, qty: 150 },
          { name: 'Zucchini', unit: 'g', cals: 0.17, pro: 0.01, fat: 0, carbs: 0.03, qty: 200 },
          { name: 'Garlic', unit: 'g', cals: 1.49, pro: 0.06, fat: 0, carbs: 0.33, qty: 10 }
        ],
        steps: [
          'Spiralize the zucchini into noodles (zoodles).',
          'Sauté minced garlic in a pan until fragrant.',
          'Add shrimp and cook until pink (3-4 mins).',
          'Toss in zoodles for 1 minute just to warm through. Do not overcook.'
        ],
        micros: [{ name: 'Vitamin B12', amount: 1.8 }, { name: 'Zinc', amount: 2.3 }]
      },
      {
        name: 'Roasted Tofu & Broccoli Buddha Bowl',
        description: 'Perfect meal-prep vegan lunch.',
        image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
        cooking_time: 30,
        level_cooking: 'medium',
        ingredients: [
          { name: 'Firm Tofu', unit: 'g', cals: 1.44, pro: 0.16, fat: 0.09, carbs: 0.03, qty: 150 },
          { name: 'Broccoli', unit: 'g', cals: 0.34, pro: 0.03, fat: 0, carbs: 0.07, qty: 150 },
          { name: 'Brown Rice', unit: 'g', cals: 1.11, pro: 0.03, fat: 0.01, carbs: 0.23, qty: 100 }
        ],
        steps: [
          'Press tofu to remove excess water, then cube.',
          'Roast tofu and broccoli florets at 200°C for 20 minutes.',
          'Cook brown rice.',
          'Assemble bowl: Rice base, top with roasted tofu and broccoli, drizzle with tahini.'
        ],
        micros: [{ name: 'Calcium', amount: 300 }, { name: 'Vitamin C', amount: 80 }]
      },
      {
        name: 'Tuna Salad Stuffed Avocados',
        description: 'Zero-cooking required! Rich in Omega-3.',
        image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd', // Using a placeholder salad
        cooking_time: 10,
        level_cooking: 'easy',
        ingredients: [
          { name: 'Canned Tuna', unit: 'g', cals: 1.16, pro: 0.26, fat: 0.01, carbs: 0, qty: 100 },
          { name: 'Avocado', unit: 'g', cals: 1.6, pro: 0.02, fat: 0.15, carbs: 0.09, qty: 150 },
          { name: 'Celery', unit: 'g', cals: 0.16, pro: 0.01, fat: 0, carbs: 0.03, qty: 50 }
        ],
        steps: [
          'Halve the avocados and remove the pit.',
          'Drain the canned tuna and mix with finely diced celery.',
          'Scoop a little avocado out to make room, mix that into the tuna.',
          'Stuff the avocado halves with the tuna mixture and serve.'
        ],
        micros: [{ name: 'Vitamin B12', amount: 2.9 }]
      },
      {
        name: 'Muscle-Builder Oatmeal',
        description: 'Heavy duty breakfast for bulking phases.',
        image_url: 'https://images.unsplash.com/photo-1517673132405-a56a62b18caf',
        cooking_time: 10,
        level_cooking: 'easy',
        ingredients: [
          { name: 'Oats', unit: 'g', cals: 3.89, pro: 0.17, fat: 0.07, carbs: 0.66, qty: 100 },
          { name: 'Whey Protein', unit: 'g', cals: 3.75, pro: 0.8, fat: 0.03, carbs: 0.05, qty: 30 },
          { name: 'Peanut Butter', unit: 'g', cals: 5.88, pro: 0.25, fat: 0.5, carbs: 0.2, qty: 30 }
        ],
        steps: [
          'Cook oats with water or milk in the microwave or stove.',
          'Let cool slightly, then stir in the whey protein powder (to prevent clumping).',
          'Swirl in peanut butter on top.',
          'Enjoy your high-protein, calorie-dense breakfast.'
        ],
        micros: [{ name: 'Calcium', amount: 150 }, { name: 'Iron', amount: 3.0 }]
      }
    ];

    console.log('🔄 Đang gieo lại dữ liệu hạt giống MỚI VÀ HOÀN HẢO...');
    
    for (const rData of recipesData) {
      const recipeId = new mongoose.Types.ObjectId().toString();
      
      let totalCals = 0, totalPro = 0, totalFat = 0, totalCarbs = 0;
      const cookingStepString = rData.steps.map((s, idx) => `${idx + 1}. ${s}`).join('\n');

      const recipe = new Recipe({
        _id: recipeId,
        name: rData.name,
        description: rData.description,
        image_url: rData.image_url,
        cooking_time: rData.cooking_time,
        base_servings: 1,
        status: 'published',
        level_cooking: rData.level_cooking,
        cooking_step: cookingStepString
      });
      await recipe.save();

      for (const ing of rData.ingredients) {
        let dbIng = await Ingredient.findOne({ name: ing.name });
        if (!dbIng) {
          dbIng = new Ingredient({
            _id: new mongoose.Types.ObjectId().toString(),
            name: ing.name,
            unit: ing.unit,
            calories_per_unit: ing.cals,
            protein: ing.pro,
            fat: ing.fat,
            carbs: ing.carbs,
            description: `High quality ${ing.name}`
          });
          await dbIng.save();
        }

        totalCals += ing.cals * ing.qty;
        totalPro += ing.pro * ing.qty;
        totalFat += ing.fat * ing.qty;
        totalCarbs += ing.carbs * ing.qty;

        await RecipeIngredient.create({
          _id: new mongoose.Types.ObjectId().toString(),
          recipe_id: recipeId,
          ingredient_id: dbIng._id,
          base_quantity: ing.qty,
          unit: ing.unit
        });
      }

      await RecipeNutrition.create({
        _id: new mongoose.Types.ObjectId().toString(),
        recipe_id: recipeId,
        calories: Math.round(totalCals),
        protein: Math.round(totalPro),
        fat: Math.round(totalFat),
        carbs: Math.round(totalCarbs)
      });

      const stepDocs = rData.steps.map((s, idx) => ({
        _id: new mongoose.Types.ObjectId().toString(),
        recipe_id: recipeId,
        step_number: idx + 1,
        instruction: s
      }));
      await RecipeStep.insertMany(stepDocs);

      if (rData.micros) {
        for (const micro of rData.micros) {
          await RecipeMicronutrientValue.create({
            _id: new mongoose.Types.ObjectId().toString(),
            recipe_id: recipeId,
            micronutrient_id: microMap[micro.name],
            amount: micro.amount
          });
        }
      }

      console.log(`✅ Fixed & Populated: ${rData.name}`);
    }

    console.log('\n🎉 Hoàn thành! Hệ thống DB đã được làm sạch và thiết lập lại 11 công thức chuẩn 10/10.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

resetAndSeed();
