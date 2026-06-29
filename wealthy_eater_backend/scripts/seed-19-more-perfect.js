require('dotenv').config();
const mongoose = require('mongoose');

const Recipe = require('../src/models/Recipe');
const Ingredient = require('../src/models/Ingredient');
const RecipeIngredient = require('../src/models/RecipeIngredient');
const RecipeNutrition = require('../src/models/RecipeNutrition');
const RecipeStep = require('../src/models/RecipeStep');
const Micronutrient = require('../src/models/Micronutrient');
const RecipeMicronutrientValue = require('../src/models/RecipeMicronutrientValue');

async function seed19MorePerfect() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB. 🚀 Đang tiến hành thêm 19 Perfect Recipes mới...');

    // Fetch existing micronutrients to map them
    const existingMicros = await Micronutrient.find();
    const microMap = {};
    existingMicros.forEach(m => microMap[m.name] = m._id);

    // If some basic micros are missing, we add them (should already be there from previous seed)

    const newRecipesData = [
      {
        name: 'Lemon Herb Grilled Salmon',
        description: 'A light, citrusy salmon dish rich in Omega-3 fatty acids.',
        image_url: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2',
        cooking_time: 15,
        level_cooking: 'easy',
        ingredients: [
          { name: 'Premium Atlantic Salmon', unit: 'g', cals: 2.08, pro: 0.2, fat: 0.13, carbs: 0, qty: 150 },
          { name: 'Lemon', unit: 'g', cals: 0.29, pro: 0.01, fat: 0, carbs: 0.09, qty: 30 },
          { name: 'Asparagus', unit: 'g', cals: 0.2, pro: 0.02, fat: 0, carbs: 0.04, qty: 150 }
        ],
        steps: [
          'Preheat grill to medium-high.',
          'Season salmon and asparagus with lemon juice, salt, and pepper.',
          'Grill salmon for 4-5 minutes per side.',
          'Grill asparagus until tender.'
        ],
        micros: [{ name: 'Vitamin D', amount: 550 }, { name: 'Vitamin C', amount: 15 }]
      },
      {
        name: 'Spicy Black Bean & Quinoa Bowl',
        description: 'A fiber-packed, plant-based bowl with a spicy kick.',
        image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
        cooking_time: 25,
        level_cooking: 'medium',
        ingredients: [
          { name: 'Black Beans', unit: 'g', cals: 1.32, pro: 0.09, fat: 0.01, carbs: 0.24, qty: 150 },
          { name: 'Organic White Quinoa', unit: 'g', cals: 1.2, pro: 0.04, fat: 0.02, carbs: 0.21, qty: 100 },
          { name: 'Corn', unit: 'g', cals: 0.86, pro: 0.03, fat: 0.01, carbs: 0.19, qty: 50 }
        ],
        steps: [
          'Cook quinoa according to package instructions.',
          'Warm black beans and corn in a skillet with chili powder.',
          'Top quinoa with the bean and corn mixture.',
          'Garnish with fresh cilantro.'
        ],
        micros: [{ name: 'Iron', amount: 4.2 }, { name: 'Zinc', amount: 1.5 }]
      },
      {
        name: 'Turkey & Sweet Potato Skillet',
        description: 'A savory, nutrient-dense skillet perfect for meal prep.',
        image_url: 'https://images.unsplash.com/photo-1514326640560-7d063ef2aed5',
        cooking_time: 30,
        level_cooking: 'medium',
        ingredients: [
          { name: 'Lean Ground Turkey', unit: 'g', cals: 1.49, pro: 0.27, fat: 0.08, carbs: 0, qty: 150 },
          { name: 'Sweet Potato', unit: 'g', cals: 0.86, pro: 0.02, fat: 0, carbs: 0.2, qty: 150 },
          { name: 'Bell Pepper', unit: 'g', cals: 0.2, pro: 0.01, fat: 0, carbs: 0.05, qty: 100 }
        ],
        steps: [
          'Dice sweet potatoes and bell peppers.',
          'Brown the ground turkey in a large skillet.',
          'Add sweet potatoes and cook until soft.',
          'Stir in bell peppers and cook for 3 more minutes.'
        ],
        micros: [{ name: 'Vitamin C', amount: 90 }, { name: 'Iron', amount: 3.2 }]
      },
      {
        name: 'Pesto Chicken & Zoodles',
        description: 'Low carb Italian classic swapped with zucchini noodles.',
        image_url: 'https://images.unsplash.com/photo-1551248429-40975aa4de74',
        cooking_time: 15,
        level_cooking: 'easy',
        ingredients: [
          { name: 'Chicken Breast', unit: 'g', cals: 1.65, pro: 0.31, fat: 0.04, carbs: 0, qty: 150 },
          { name: 'Zucchini', unit: 'g', cals: 0.17, pro: 0.01, fat: 0, carbs: 0.03, qty: 200 },
          { name: 'Pesto Sauce', unit: 'g', cals: 4.0, pro: 0.05, fat: 0.4, carbs: 0.04, qty: 30 }
        ],
        steps: [
          'Spiralize zucchini into noodles.',
          'Cook diced chicken breast in a skillet until fully cooked.',
          'Add zoodles and pesto sauce.',
          'Toss over low heat for 1 minute.'
        ],
        micros: [{ name: 'Calcium', amount: 100 }, { name: 'Iron', amount: 2.1 }]
      },
      {
        name: 'Vegan Chickpea Salad Lettuce Wraps',
        description: 'A creamy, vegan alternative to tuna salad served in crisp lettuce.',
        image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd',
        cooking_time: 10,
        level_cooking: 'easy',
        ingredients: [
          { name: 'Chickpeas', unit: 'g', cals: 1.64, pro: 0.09, fat: 0.03, carbs: 0.27, qty: 150 },
          { name: 'Vegan Mayo', unit: 'g', cals: 6.8, pro: 0, fat: 0.7, carbs: 0.04, qty: 20 },
          { name: 'Lettuce', unit: 'g', cals: 0.15, pro: 0.01, fat: 0, carbs: 0.03, qty: 50 }
        ],
        steps: [
          'Mash chickpeas in a bowl with a fork.',
          'Stir in vegan mayo, salt, and pepper.',
          'Wash and dry large lettuce leaves.',
          'Spoon the chickpea salad into the lettuce cups.'
        ],
        micros: [{ name: 'Iron', amount: 3.5 }]
      },
      {
        name: 'Beef & Broccoli Stir-fry',
        description: 'A protein-heavy, classic takeout dish made healthy.',
        image_url: 'https://images.unsplash.com/photo-1600891964092-4316c288032e',
        cooking_time: 20,
        level_cooking: 'medium',
        ingredients: [
          { name: 'Lean Beef Steak', unit: 'g', cals: 2.5, pro: 0.26, fat: 0.15, carbs: 0, qty: 150 },
          { name: 'Broccoli', unit: 'g', cals: 0.34, pro: 0.03, fat: 0, carbs: 0.07, qty: 150 },
          { name: 'Soy Sauce', unit: 'ml', cals: 0.53, pro: 0.08, fat: 0, carbs: 0.05, qty: 15 }
        ],
        steps: [
          'Thinly slice the beef against the grain.',
          'Stir-fry the beef in a hot wok until browned.',
          'Add broccoli florets and soy sauce.',
          'Cover and steam for 3 minutes until broccoli is tender.'
        ],
        micros: [{ name: 'Vitamin C', amount: 80 }, { name: 'Zinc', amount: 6.0 }]
      },
      {
        name: 'Teriyaki Glazed Tofu & Rice',
        description: 'Sweet and savory plant-based protein bowl.',
        image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
        cooking_time: 25,
        level_cooking: 'medium',
        ingredients: [
          { name: 'Firm Tofu', unit: 'g', cals: 1.44, pro: 0.16, fat: 0.09, carbs: 0.03, qty: 150 },
          { name: 'Brown Rice', unit: 'g', cals: 1.11, pro: 0.03, fat: 0.01, carbs: 0.23, qty: 100 },
          { name: 'Teriyaki Sauce', unit: 'g', cals: 1.5, pro: 0.05, fat: 0, carbs: 0.3, qty: 30 }
        ],
        steps: [
          'Press the tofu and cut into cubes.',
          'Pan-fry tofu until golden brown on all sides.',
          'Add teriyaki sauce and simmer until thick.',
          'Serve over steamed brown rice.'
        ],
        micros: [{ name: 'Calcium', amount: 300 }]
      },
      {
        name: 'Tuna Nicoise Salad',
        description: 'A French classic loaded with protein and healthy fats.',
        image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd',
        cooking_time: 15,
        level_cooking: 'easy',
        ingredients: [
          { name: 'Canned Tuna', unit: 'g', cals: 1.16, pro: 0.26, fat: 0.01, carbs: 0, qty: 100 },
          { name: 'Eggs', unit: 'item', cals: 70, pro: 6, fat: 5, carbs: 0, qty: 1 },
          { name: 'Green Beans', unit: 'g', cals: 0.31, pro: 0.02, fat: 0, carbs: 0.07, qty: 100 }
        ],
        steps: [
          'Hard boil the egg, then peel and slice.',
          'Blanch the green beans in boiling water for 3 minutes.',
          'Flake the tuna over a bed of greens.',
          'Arrange eggs and beans on top with a light dressing.'
        ],
        micros: [{ name: 'Vitamin B12', amount: 3.5 }]
      },
      {
        name: 'Healthy Baked Chicken Parmesan',
        description: 'A lighter take on the Italian comfort food.',
        image_url: 'https://images.unsplash.com/photo-1514326640560-7d063ef2aed5',
        cooking_time: 35,
        level_cooking: 'medium',
        ingredients: [
          { name: 'Chicken Breast', unit: 'g', cals: 1.65, pro: 0.31, fat: 0.04, carbs: 0, qty: 150 },
          { name: 'Marinara Sauce', unit: 'g', cals: 0.5, pro: 0.01, fat: 0.01, carbs: 0.09, qty: 100 },
          { name: 'Mozzarella Cheese', unit: 'g', cals: 3.0, pro: 0.22, fat: 0.22, carbs: 0.02, qty: 30 }
        ],
        steps: [
          'Preheat oven to 200°C.',
          'Place chicken in a baking dish and top with marinara.',
          'Bake for 20 minutes.',
          'Top with mozzarella and bake for 5 more minutes until melted.'
        ],
        micros: [{ name: 'Calcium', amount: 200 }]
      },
      {
        name: 'Shrimp & Asparagus Foil Packets',
        description: 'Zero cleanup, maximum flavor healthy seafood dish.',
        image_url: 'https://images.unsplash.com/photo-1551248429-40975aa4de74',
        cooking_time: 20,
        level_cooking: 'easy',
        ingredients: [
          { name: 'Shrimp', unit: 'g', cals: 0.99, pro: 0.24, fat: 0, carbs: 0, qty: 150 },
          { name: 'Asparagus', unit: 'g', cals: 0.2, pro: 0.02, fat: 0, carbs: 0.04, qty: 150 },
          { name: 'Garlic Butter', unit: 'g', cals: 7.17, pro: 0.01, fat: 0.81, carbs: 0, qty: 10 }
        ],
        steps: [
          'Preheat oven to 200°C.',
          'Place shrimp and asparagus on a large piece of aluminum foil.',
          'Top with garlic butter, fold foil to seal the packet.',
          'Bake for 15 minutes.'
        ],
        micros: [{ name: 'Vitamin B12', amount: 1.8 }, { name: 'Zinc', amount: 2.3 }]
      },
      {
        name: 'Greek Turkey Burgers',
        description: 'Lean turkey patties infused with Mediterranean spices.',
        image_url: 'https://images.unsplash.com/photo-1514326640560-7d063ef2aed5',
        cooking_time: 20,
        level_cooking: 'medium',
        ingredients: [
          { name: 'Lean Ground Turkey', unit: 'g', cals: 1.49, pro: 0.27, fat: 0.08, carbs: 0, qty: 150 },
          { name: 'Feta Cheese', unit: 'g', cals: 2.64, pro: 0.14, fat: 0.21, carbs: 0.04, qty: 20 },
          { name: 'Lettuce', unit: 'g', cals: 0.15, pro: 0.01, fat: 0, carbs: 0.03, qty: 50 }
        ],
        steps: [
          'Mix ground turkey with crumbled feta and spices.',
          'Form into patties.',
          'Grill or pan-fry for 6-7 minutes per side.',
          'Serve wrapped in large lettuce leaves.'
        ],
        micros: [{ name: 'Iron', amount: 2.5 }, { name: 'Zinc', amount: 4.2 }]
      },
      {
        name: 'Vegetable & Egg Scramble',
        description: 'A quick, high-protein vegetarian breakfast.',
        image_url: 'https://images.unsplash.com/photo-1600891964092-4316c288032e',
        cooking_time: 10,
        level_cooking: 'easy',
        ingredients: [
          { name: 'Eggs', unit: 'item', cals: 70, pro: 6, fat: 5, carbs: 0, qty: 3 },
          { name: 'Spinach', unit: 'g', cals: 0.23, pro: 0.03, fat: 0, carbs: 0.04, qty: 50 },
          { name: 'Bell Pepper', unit: 'g', cals: 0.2, pro: 0.01, fat: 0, carbs: 0.05, qty: 50 }
        ],
        steps: [
          'Whisk eggs in a bowl.',
          'Sauté diced bell pepper in a pan until soft.',
          'Add spinach and cook until wilted.',
          'Pour in eggs and scramble until fully cooked.'
        ],
        micros: [{ name: 'Vitamin B12', amount: 1.5 }, { name: 'Vitamin C', amount: 40 }]
      },
      {
        name: 'Coconut Curry Chicken',
        description: 'Rich, flavorful, and loaded with protein.',
        image_url: 'https://images.unsplash.com/photo-1547592180-85f173990554',
        cooking_time: 30,
        level_cooking: 'medium',
        ingredients: [
          { name: 'Chicken Breast', unit: 'g', cals: 1.65, pro: 0.31, fat: 0.04, carbs: 0, qty: 150 },
          { name: 'Coconut Milk', unit: 'ml', cals: 1.97, pro: 0.02, fat: 0.21, carbs: 0.03, qty: 100 },
          { name: 'Curry Paste', unit: 'g', cals: 1.0, pro: 0.02, fat: 0.02, carbs: 0.15, qty: 20 }
        ],
        steps: [
          'Dice and brown the chicken in a pot.',
          'Stir in curry paste and cook for 1 minute.',
          'Pour in coconut milk and simmer for 15 minutes.',
          'Serve hot over rice or quinoa.'
        ],
        micros: [{ name: 'Iron', amount: 2.0 }]
      },
      {
        name: 'Peanut Butter Banana Protein Smoothie',
        description: 'The ultimate post-workout liquid meal.',
        image_url: 'https://images.unsplash.com/photo-1488477181946-6428a0291777',
        cooking_time: 5,
        level_cooking: 'easy',
        ingredients: [
          { name: 'Whey Protein', unit: 'g', cals: 3.75, pro: 0.8, fat: 0.03, carbs: 0.05, qty: 30 },
          { name: 'Banana', unit: 'g', cals: 0.89, pro: 0.01, fat: 0, carbs: 0.23, qty: 120 },
          { name: 'Peanut Butter', unit: 'g', cals: 5.88, pro: 0.25, fat: 0.5, carbs: 0.2, qty: 30 }
        ],
        steps: [
          'Add a frozen banana, whey protein, and peanut butter to a blender.',
          'Add water or almond milk.',
          'Blend until completely smooth.',
          'Drink immediately.'
        ],
        micros: [{ name: 'Calcium', amount: 150 }]
      },
      {
        name: 'Quinoa Salad with Roasted Vegetables',
        description: 'A hearty, nutrient-dense vegan salad.',
        image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd',
        cooking_time: 35,
        level_cooking: 'medium',
        ingredients: [
          { name: 'Organic White Quinoa', unit: 'g', cals: 1.2, pro: 0.04, fat: 0.02, carbs: 0.21, qty: 100 },
          { name: 'Zucchini', unit: 'g', cals: 0.17, pro: 0.01, fat: 0, carbs: 0.03, qty: 100 },
          { name: 'Bell Pepper', unit: 'g', cals: 0.2, pro: 0.01, fat: 0, carbs: 0.05, qty: 100 }
        ],
        steps: [
          'Cook quinoa and let it cool.',
          'Dice zucchini and bell peppers, roast at 200°C for 20 minutes.',
          'Mix roasted vegetables with quinoa.',
          'Dress with olive oil and lemon juice.'
        ],
        micros: [{ name: 'Vitamin C', amount: 120 }]
      },
      {
        name: 'Blackened Mahi-Mahi Tacos',
        description: 'Spicy fish tacos using lettuce cups to save carbs.',
        image_url: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2',
        cooking_time: 15,
        level_cooking: 'medium',
        ingredients: [
          { name: 'Mahi-Mahi Fillet', unit: 'g', cals: 0.85, pro: 0.19, fat: 0.01, carbs: 0, qty: 150 },
          { name: 'Lettuce', unit: 'g', cals: 0.15, pro: 0.01, fat: 0, carbs: 0.03, qty: 50 },
          { name: 'Avocado', unit: 'g', cals: 1.6, pro: 0.02, fat: 0.15, carbs: 0.09, qty: 50 }
        ],
        steps: [
          'Coat fish in blackened seasoning.',
          'Pan-sear fish for 3-4 minutes per side.',
          'Flake the fish and serve in lettuce cups.',
          'Top with sliced avocado.'
        ],
        micros: [{ name: 'Vitamin B12', amount: 1.2 }]
      },
      {
        name: 'Miso Glazed Eggplant',
        description: 'A savory, umami-rich vegan side or light main.',
        image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
        cooking_time: 25,
        level_cooking: 'easy',
        ingredients: [
          { name: 'Eggplant', unit: 'g', cals: 0.25, pro: 0.01, fat: 0.002, carbs: 0.06, qty: 200 },
          { name: 'Miso Paste', unit: 'g', cals: 1.98, pro: 0.12, fat: 0.06, carbs: 0.25, qty: 20 },
          { name: 'Sesame Oil', unit: 'ml', cals: 8.84, pro: 0, fat: 1.0, carbs: 0, qty: 10 }
        ],
        steps: [
          'Slice eggplant in half and score the flesh.',
          'Mix miso paste and sesame oil, brush onto eggplant.',
          'Roast at 200°C for 20 minutes until tender and caramelized.'
        ],
        micros: [{ name: 'Zinc', amount: 0.8 }]
      },
      {
        name: 'Spinach & Mushroom Frittata',
        description: 'A great low-carb meal for any time of the day.',
        image_url: 'https://images.unsplash.com/photo-1600891964092-4316c288032e',
        cooking_time: 25,
        level_cooking: 'medium',
        ingredients: [
          { name: 'Eggs', unit: 'item', cals: 70, pro: 6, fat: 5, carbs: 0, qty: 4 },
          { name: 'Spinach', unit: 'g', cals: 0.23, pro: 0.03, fat: 0, carbs: 0.04, qty: 100 },
          { name: 'Mushrooms', unit: 'g', cals: 0.22, pro: 0.03, fat: 0.003, carbs: 0.03, qty: 100 }
        ],
        steps: [
          'Sauté mushrooms in an oven-safe skillet until browned.',
          'Add spinach and cook until wilted.',
          'Pour beaten eggs over the vegetables.',
          'Bake at 180°C for 15 minutes until set.'
        ],
        micros: [{ name: 'Iron', amount: 3.5 }, { name: 'Vitamin B12', amount: 2.0 }]
      },
      {
        name: 'Protein Pancakes',
        description: 'A bodybuilder favorite using oats and cottage cheese.',
        image_url: 'https://images.unsplash.com/photo-1517673132405-a56a62b18caf',
        cooking_time: 15,
        level_cooking: 'medium',
        ingredients: [
          { name: 'Oats', unit: 'g', cals: 3.89, pro: 0.17, fat: 0.07, carbs: 0.66, qty: 50 },
          { name: 'Eggs', unit: 'item', cals: 70, pro: 6, fat: 5, carbs: 0, qty: 2 },
          { name: 'Cottage Cheese', unit: 'g', cals: 0.98, pro: 0.11, fat: 0.04, carbs: 0.03, qty: 100 }
        ],
        steps: [
          'Blend oats, eggs, and cottage cheese until smooth.',
          'Pour batter onto a hot, greased griddle.',
          'Cook until bubbles form, then flip.',
          'Serve with sugar-free syrup.'
        ],
        micros: [{ name: 'Calcium', amount: 150 }]
      }
    ];

    for (const rData of newRecipesData) {
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
          if (microMap[micro.name]) {
            await RecipeMicronutrientValue.create({
              _id: new mongoose.Types.ObjectId().toString(),
              recipe_id: recipeId,
              micronutrient_id: microMap[micro.name],
              amount: micro.amount
            });
          }
        }
      }

      console.log(`✅ Added Perfect Recipe: ${rData.name}`);
    }

    console.log('\n🎉 Hoàn thành thêm 19 công thức mới!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed19MorePerfect();
