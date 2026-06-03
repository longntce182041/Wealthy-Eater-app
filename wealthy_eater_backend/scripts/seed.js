require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const modelsDir = path.join(__dirname, '../src/models');

function loadModels() {
  const modelFiles = fs
    .readdirSync(modelsDir)
    .filter((file) => file.endsWith('.js'));

  for (const file of modelFiles) {
    require(path.join(modelsDir, file));
  }
}

async function ensureCollections() {
  const modelNames = mongoose.modelNames();

  for (const modelName of modelNames) {
    await mongoose.model(modelName).createCollection();
    console.log(`Created or verified collection for ${modelName}`);
  }
}

async function seedAllModels() {
  const now = new Date();

  // 1. Delete all existing data from every model to avoid duplicates or junk
  const modelNames = mongoose.modelNames();
  for (const modelName of modelNames) {
    await mongoose.model(modelName).deleteMany({});
    console.log(`Cleared all documents from collection: ${modelName}`);
  }

  // 2. Define ObjectIDs for complete relational mapping
  const ids = {
    // Admin
    adminUserId: new mongoose.Types.ObjectId().toString(),

    // Nutritionists (User and profile mappings)
    nutriUser1Id: new mongoose.Types.ObjectId().toString(),
    nutri1Id: new mongoose.Types.ObjectId().toString(),
    nutriUser2Id: new mongoose.Types.ObjectId().toString(),
    nutri2Id: new mongoose.Types.ObjectId().toString(),
    nutriUser3Id: new mongoose.Types.ObjectId().toString(),
    nutri3Id: new mongoose.Types.ObjectId().toString(),

    // Customers (Users)
    custUser1Id: new mongoose.Types.ObjectId().toString(),
    custUser2Id: new mongoose.Types.ObjectId().toString(),
    custUser3Id: new mongoose.Types.ObjectId().toString(),
    custUser4Id: new mongoose.Types.ObjectId().toString(),
    custUser5Id: new mongoose.Types.ObjectId().toString(),

    // Medical Conditions
    condDiabetesId: new mongoose.Types.ObjectId().toString(),
    condHypertensionId: new mongoose.Types.ObjectId().toString(),
    condObesityId: new mongoose.Types.ObjectId().toString(),

    // Micronutrients
    microProteinId: new mongoose.Types.ObjectId().toString(),
    microVitaminCId: new mongoose.Types.ObjectId().toString(),
    microIronId: new mongoose.Types.ObjectId().toString(),
    microCalciumId: new mongoose.Types.ObjectId().toString(),
    microSodiumId: new mongoose.Types.ObjectId().toString(),

    // Ingredients
    ingChickenId: new mongoose.Types.ObjectId().toString(),
    ingBrownRiceId: new mongoose.Types.ObjectId().toString(),
    ingBroccoliId: new mongoose.Types.ObjectId().toString(),
    ingSalmonId: new mongoose.Types.ObjectId().toString(),
    ingSweetPotatoId: new mongoose.Types.ObjectId().toString(),
    ingSpinachId: new mongoose.Types.ObjectId().toString(),
    ingOliveOilId: new mongoose.Types.ObjectId().toString(),
    ingBeefId: new mongoose.Types.ObjectId().toString(),
    ingTofuId: new mongoose.Types.ObjectId().toString(),
    ingBreadId: new mongoose.Types.ObjectId().toString(),
    ingEggId: new mongoose.Types.ObjectId().toString(),
    ingBananaId: new mongoose.Types.ObjectId().toString(),
    ingAvocadoId: new mongoose.Types.ObjectId().toString(),
    ingMilkId: new mongoose.Types.ObjectId().toString(),
    ingOatsId: new mongoose.Types.ObjectId().toString(),

    // Recipes
    recChickenBowlId: new mongoose.Types.ObjectId().toString(),
    recSalmonSweetId: new mongoose.Types.ObjectId().toString(),
    recAvocadoEggId: new mongoose.Types.ObjectId().toString(),
    recBeefSpinachId: new mongoose.Types.ObjectId().toString(),
    recTofuVeggieId: new mongoose.Types.ObjectId().toString(),
    recOatmealBananaId: new mongoose.Types.ObjectId().toString(),

    // Contracts
    contract1Id: new mongoose.Types.ObjectId().toString(),
    contract2Id: new mongoose.Types.ObjectId().toString(),
    contract3Id: new mongoose.Types.ObjectId().toString(),
  };

  // 3. Hash passwords (standard password for all mock accounts)
  const hashedPassword = await bcrypt.hash('password123', 10);

  // 4. Seed Users
  const users = [
    // Admin
    { _id: ids.adminUserId, email: 'admin@wealthyeater.com', password_hash: hashedPassword, role: 'admin', created_at: now },
    
    // Nutritionists
    { _id: ids.nutriUser1Id, email: 'doctor.kien@wealthyeater.com', password_hash: hashedPassword, role: 'nutritionist', created_at: now },
    { _id: ids.nutriUser2Id, email: 'doctor.linh@wealthyeater.com', password_hash: hashedPassword, role: 'nutritionist', created_at: now },
    { _id: ids.nutriUser3Id, email: 'doctor.minh@wealthyeater.com', password_hash: hashedPassword, role: 'nutritionist', created_at: now },

    // Customers
    { _id: ids.custUser1Id, email: 'customer.an@gmail.com', password_hash: hashedPassword, role: 'customer', created_at: now },
    { _id: ids.custUser2Id, email: 'customer.binh@gmail.com', password_hash: hashedPassword, role: 'customer', created_at: now },
    { _id: ids.custUser3Id, email: 'customer.chi@gmail.com', password_hash: hashedPassword, role: 'customer', created_at: now },
    { _id: ids.custUser4Id, email: 'customer.dung@gmail.com', password_hash: hashedPassword, role: 'customer', created_at: now },
    { _id: ids.custUser5Id, email: 'customer.hoa@gmail.com', password_hash: hashedPassword, role: 'customer', created_at: now },
  ];
  await mongoose.model('User').insertMany(users);
  console.log(`Seeded ${users.length} Users.`);

  // 5. Seed User Profiles (for Customers)
  const userProfiles = [
    {
      _id: new mongoose.Types.ObjectId().toString(),
      user_id: ids.custUser1Id,
      age: 30,
      gender: 'male',
      height: 175,
      weight: 85,
      health_goal: 'lose weight',
      bmi: 27.8,
      tdee: 2400,
      bmr: '1800'
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      user_id: ids.custUser2Id,
      age: 25,
      gender: 'male',
      height: 180,
      weight: 70,
      health_goal: 'gain muscle',
      bmi: 21.6,
      tdee: 2600,
      bmr: '1700'
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      user_id: ids.custUser3Id,
      age: 45,
      gender: 'female',
      height: 160,
      weight: 65,
      health_goal: 'maintain health',
      bmi: 25.4,
      tdee: 1800,
      bmr: '1300'
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      user_id: ids.custUser4Id,
      age: 22,
      gender: 'female',
      height: 155,
      weight: 58,
      health_goal: 'lose weight',
      bmi: 24.1,
      tdee: 1700,
      bmr: '1250'
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      user_id: ids.custUser5Id,
      age: 35,
      gender: 'female',
      height: 165,
      weight: 55,
      health_goal: 'maintain health',
      bmi: 20.2,
      tdee: 1900,
      bmr: '1350'
    }
  ];
  await mongoose.model('UserProfile').insertMany(userProfiles);
  console.log(`Seeded ${userProfiles.length} UserProfiles.`);

  // 6. Seed Medical Conditions
  const medicalConditions = [
    {
      _id: ids.condDiabetesId,
      name: 'Type 2 Diabetes',
      category: 'Metabolic',
      description: 'Chronic condition affecting blood sugar regulation.',
      dietary_guideline: 'Prefer low glycemic, high fiber meals. Restrict simple sugars.'
    },
    {
      _id: ids.condHypertensionId,
      name: 'Hypertension',
      category: 'Cardiovascular',
      description: 'High blood pressure that can increase risk of heart disease.',
      dietary_guideline: 'Reduce sodium intake (< 1500mg/day). Emphasize potassium, calcium, magnesium.'
    },
    {
      _id: ids.condObesityId,
      name: 'Obesity',
      category: 'Metabolic',
      description: 'Excessive body fat accumulation that presents a health risk.',
      dietary_guideline: 'Caloric deficit. High protein, high fiber, high satiety food.'
    }
  ];
  await mongoose.model('MedicalCondition').insertMany(medicalConditions);
  console.log(`Seeded ${medicalConditions.length} MedicalConditions.`);

  // 7. Seed UserDietaries
  const userDietaries = [
    {
      _id: new mongoose.Types.ObjectId().toString(),
      user_id: ids.custUser1Id,
      medical_condition_id: ids.condDiabetesId,
      allergies: ['peanuts'],
      dislike_ingredients: ['celery'],
      cooking_skill_level: 'beginner',
      available_cooking_time: 30
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      user_id: ids.custUser2Id,
      medical_condition_id: null,
      allergies: [],
      dislike_ingredients: [],
      cooking_skill_level: 'intermediate',
      available_cooking_time: 45
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      user_id: ids.custUser3Id,
      medical_condition_id: ids.condHypertensionId,
      allergies: ['shrimp'],
      dislike_ingredients: ['coriander'],
      cooking_skill_level: 'expert',
      available_cooking_time: 60
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      user_id: ids.custUser4Id,
      medical_condition_id: ids.condObesityId,
      allergies: [],
      dislike_ingredients: [],
      cooking_skill_level: 'beginner',
      available_cooking_time: 30
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      user_id: ids.custUser5Id,
      medical_condition_id: null,
      allergies: [],
      dislike_ingredients: [],
      cooking_skill_level: 'intermediate',
      available_cooking_time: 40
    }
  ];
  await mongoose.model('UserDietary').insertMany(userDietaries);
  console.log(`Seeded ${userDietaries.length} UserDietaries.`);

  // 8. Seed Nutritionists
  const nutritionists = [
    {
      _id: ids.nutri1Id,
      user_id: ids.nutriUser1Id,
      full_name: 'Dr. Kien Nguyen',
      specialization: 'Metabolic Health & Weight Loss',
      service_fee: 200000,
      certification_url: 'https://example.com/certifications/kien-nguyen.pdf',
      approval_status: 'approval',
      average_rating: 4.8
    },
    {
      _id: ids.nutri2Id,
      user_id: ids.nutriUser2Id,
      full_name: 'Dr. Linh Tran',
      specialization: 'Sports Nutrition & Muscle Gain',
      service_fee: 250000,
      certification_url: 'https://example.com/certifications/linh-tran.pdf',
      approval_status: 'approval',
      average_rating: 4.9
    },
    {
      _id: ids.nutri3Id,
      user_id: ids.nutriUser3Id,
      full_name: 'Dr. Minh Pham',
      specialization: 'Pediatric & Family Nutrition',
      service_fee: 150000,
      certification_url: 'https://example.com/certifications/minh-pham.pdf',
      approval_status: 'approval',
      average_rating: 4.5
    }
  ];
  await mongoose.model('Nutritionist').insertMany(nutritionists);
  console.log(`Seeded ${nutritionists.length} Nutritionists.`);

  // 9. Seed Micronutrients
  const micronutrients = [
    { _id: ids.microProteinId, name: 'Protein', unit: 'g', description: 'Essential for cell growth and repair.' },
    { _id: ids.microVitaminCId, name: 'Vitamin C', unit: 'mg', description: 'Antioxidant, supports immune health.' },
    { _id: ids.microIronId, name: 'Iron', unit: 'mg', description: 'Crucial for red blood cell formation.' },
    { _id: ids.microCalciumId, name: 'Calcium', unit: 'mg', description: 'Supports bone and tooth structure.' },
    { _id: ids.microSodiumId, name: 'Sodium', unit: 'mg', description: 'Maintains fluid balance and nerve function.' },
  ];
  await mongoose.model('Micronutrient').insertMany(micronutrients);
  console.log(`Seeded ${micronutrients.length} Micronutrients.`);

  // 10. Seed Ingredients with exact properties per 100g
  const ingredients = [
    {
      _id: ids.ingChickenId,
      name: 'Chicken Breast',
      image_url: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&q=80&w=400',
      calories_per_unit: 165,
      protein: 31,
      fat: 3.6,
      carbs: 0,
      description: 'Lean high-protein meat with minimal fat content.',
      unit: '100g'
    },
    {
      _id: ids.ingBrownRiceId,
      name: 'Brown Rice',
      image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=400',
      calories_per_unit: 111,
      protein: 2.6,
      fat: 0.9,
      carbs: 23,
      description: 'High fiber, low glycemic complex carbohydrate.',
      unit: '100g'
    },
    {
      _id: ids.ingBroccoliId,
      name: 'Broccoli',
      image_url: 'https://images.unsplash.com/photo-1584270354949-c26b0d5b4a4c?auto=format&fit=crop&q=80&w=400',
      calories_per_unit: 34,
      protein: 2.8,
      fat: 0.4,
      carbs: 7,
      description: 'Nutrient-rich cruciferous green vegetable.',
      unit: '100g'
    },
    {
      _id: ids.ingSalmonId,
      name: 'Salmon Fillet',
      image_url: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&q=80&w=400',
      calories_per_unit: 208,
      protein: 20,
      fat: 13,
      carbs: 0,
      description: 'Fatty fish rich in omega-3 fatty acids.',
      unit: '100g'
    },
    {
      _id: ids.ingSweetPotatoId,
      name: 'Sweet Potato',
      image_url: 'https://images.unsplash.com/photo-1596097561845-a9f4fb0a46b9?auto=format&fit=crop&q=80&w=400',
      calories_per_unit: 86,
      protein: 1.6,
      fat: 0.1,
      carbs: 20,
      description: 'Sweet, starch-rich tuber root vegetable.',
      unit: '100g'
    },
    {
      _id: ids.ingSpinachId,
      name: 'Spinach',
      image_url: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&q=80&w=400',
      calories_per_unit: 23,
      protein: 2.9,
      fat: 0.4,
      carbs: 3.6,
      description: 'Dark green leafy vegetable rich in iron.',
      unit: '100g'
    },
    {
      _id: ids.ingOliveOilId,
      name: 'Olive Oil',
      image_url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&q=80&w=400',
      calories_per_unit: 884,
      protein: 0,
      fat: 100,
      carbs: 0,
      description: 'Healthy monounsaturated fat source.',
      unit: '100g'
    },
    {
      _id: ids.ingBeefId,
      name: 'Lean Beef',
      image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=400',
      calories_per_unit: 250,
      protein: 26,
      fat: 15,
      carbs: 0,
      description: 'High quality protein source packed with iron.',
      unit: '100g'
    },
    {
      _id: ids.ingTofuId,
      name: 'Firm Tofu',
      image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=400',
      calories_per_unit: 76,
      protein: 8,
      fat: 4.8,
      carbs: 1.9,
      description: 'Soy-based plant protein alternative.',
      unit: '100g'
    },
    {
      _id: ids.ingBreadId,
      name: 'Whole Wheat Bread',
      image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=400',
      calories_per_unit: 247,
      protein: 13,
      fat: 3.4,
      carbs: 41,
      description: 'Fiber-rich whole wheat bread slices.',
      unit: '100g'
    },
    {
      _id: ids.ingEggId,
      name: 'Chicken Egg',
      image_url: 'https://images.unsplash.com/photo-1518569656558-1f25e69d93d7?auto=format&fit=crop&q=80&w=400',
      calories_per_unit: 155,
      protein: 13,
      fat: 11,
      carbs: 1.1,
      description: 'High nutrient whole chicken egg.',
      unit: '100g'
    },
    {
      _id: ids.ingBananaId,
      name: 'Banana',
      image_url: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&q=80&w=400',
      calories_per_unit: 89,
      protein: 1.1,
      fat: 0.3,
      carbs: 23,
      description: 'Sweet tropical fruit rich in potassium.',
      unit: '100g'
    },
    {
      _id: ids.ingAvocadoId,
      name: 'Avocado',
      image_url: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&q=80&w=400',
      calories_per_unit: 160,
      protein: 2,
      fat: 15,
      carbs: 9,
      description: 'Creamy fruit packed with monounsaturated healthy fats.',
      unit: '100g'
    },
    {
      _id: ids.ingMilkId,
      name: 'Skim Milk',
      image_url: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&q=80&w=400',
      calories_per_unit: 35,
      protein: 3.4,
      fat: 0.1,
      carbs: 5,
      description: 'Low fat pasteurized cow milk.',
      unit: '100g'
    },
    {
      _id: ids.ingOatsId,
      name: 'Rolled Oats',
      image_url: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?auto=format&fit=crop&q=80&w=400',
      calories_per_unit: 389,
      protein: 16.9,
      fat: 6.9,
      carbs: 66,
      description: 'Whole grain oats for breakfast oatmeal porridge.',
      unit: '100g'
    }
  ];
  await mongoose.model('Ingredient').insertMany(ingredients);
  console.log(`Seeded ${ingredients.length} Ingredients.`);

  // 11. Seed Ingredient Micronutrient Values
  const ingredientMicroValues = [
    // Chicken Breast: Protein, Iron, Sodium
    { _id: new mongoose.Types.ObjectId().toString(), ingredient_id: ids.ingChickenId, micronutrient_id: ids.microProteinId, amount: 31 },
    { _id: new mongoose.Types.ObjectId().toString(), ingredient_id: ids.ingChickenId, micronutrient_id: ids.microIronId, amount: 1.0 },
    { _id: new mongoose.Types.ObjectId().toString(), ingredient_id: ids.ingChickenId, micronutrient_id: ids.microSodiumId, amount: 74 },

    // Broccoli: Vitamin C, Calcium, Iron, Sodium
    { _id: new mongoose.Types.ObjectId().toString(), ingredient_id: ids.ingBroccoliId, micronutrient_id: ids.microVitaminCId, amount: 89.2 },
    { _id: new mongoose.Types.ObjectId().toString(), ingredient_id: ids.ingBroccoliId, micronutrient_id: ids.microCalciumId, amount: 47 },
    { _id: new mongoose.Types.ObjectId().toString(), ingredient_id: ids.ingBroccoliId, micronutrient_id: ids.microIronId, amount: 0.73 },
    { _id: new mongoose.Types.ObjectId().toString(), ingredient_id: ids.ingBroccoliId, micronutrient_id: ids.microSodiumId, amount: 33 },

    // Spinach: Vitamin C, Calcium, Iron, Sodium
    { _id: new mongoose.Types.ObjectId().toString(), ingredient_id: ids.ingSpinachId, micronutrient_id: ids.microVitaminCId, amount: 28.1 },
    { _id: new mongoose.Types.ObjectId().toString(), ingredient_id: ids.ingSpinachId, micronutrient_id: ids.microCalciumId, amount: 99 },
    { _id: new mongoose.Types.ObjectId().toString(), ingredient_id: ids.ingSpinachId, micronutrient_id: ids.microIronId, amount: 2.71 },
    { _id: new mongoose.Types.ObjectId().toString(), ingredient_id: ids.ingSpinachId, micronutrient_id: ids.microSodiumId, amount: 79 },

    // Salmon: Protein, Iron, Sodium
    { _id: new mongoose.Types.ObjectId().toString(), ingredient_id: ids.ingSalmonId, micronutrient_id: ids.microProteinId, amount: 20 },
    { _id: new mongoose.Types.ObjectId().toString(), ingredient_id: ids.ingSalmonId, micronutrient_id: ids.microIronId, amount: 0.34 },
    { _id: new mongoose.Types.ObjectId().toString(), ingredient_id: ids.ingSalmonId, micronutrient_id: ids.microSodiumId, amount: 59 },

    // Beef: Protein, Iron, Sodium
    { _id: new mongoose.Types.ObjectId().toString(), ingredient_id: ids.ingBeefId, micronutrient_id: ids.microProteinId, amount: 26 },
    { _id: new mongoose.Types.ObjectId().toString(), ingredient_id: ids.ingBeefId, micronutrient_id: ids.microIronId, amount: 2.6 },
    { _id: new mongoose.Types.ObjectId().toString(), ingredient_id: ids.ingBeefId, micronutrient_id: ids.microSodiumId, amount: 72 },

    // Tofu: Protein, Calcium, Iron
    { _id: new mongoose.Types.ObjectId().toString(), ingredient_id: ids.ingTofuId, micronutrient_id: ids.microProteinId, amount: 8.0 },
    { _id: new mongoose.Types.ObjectId().toString(), ingredient_id: ids.ingTofuId, micronutrient_id: ids.microCalciumId, amount: 350 },
    { _id: new mongoose.Types.ObjectId().toString(), ingredient_id: ids.ingTofuId, micronutrient_id: ids.microIronId, amount: 5.4 },

    // Egg: Protein, Calcium, Iron, Sodium
    { _id: new mongoose.Types.ObjectId().toString(), ingredient_id: ids.ingEggId, micronutrient_id: ids.microProteinId, amount: 13.0 },
    { _id: new mongoose.Types.ObjectId().toString(), ingredient_id: ids.ingEggId, micronutrient_id: ids.microCalciumId, amount: 50 },
    { _id: new mongoose.Types.ObjectId().toString(), ingredient_id: ids.ingEggId, micronutrient_id: ids.microIronId, amount: 1.2 },
    { _id: new mongoose.Types.ObjectId().toString(), ingredient_id: ids.ingEggId, micronutrient_id: ids.microSodiumId, amount: 124 },
  ];
  await mongoose.model('IngredientMicronutrientValue').insertMany(ingredientMicroValues);
  console.log(`Seeded ${ingredientMicroValues.length} IngredientMicronutrientValues.`);

  // 12. Seed Recipes
  const recipes = [
    {
      _id: ids.recChickenBowlId,
      name: 'Grilled Chicken & Broccoli Bowl',
      description: 'A clean, low-fat meal rich in lean protein and fiber, perfect for weight loss and muscle maintenance.',
      image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600',
      cooking_time: 25,
      base_servings: 1,
      status: 'published',
      level_cooking: 'easy',
      cooking_step: '1. Season the chicken breast with salt and pepper.\n2. Grill the chicken on medium-high heat for 6-8 minutes on each side until fully cooked.\n3. Boil or steam broccoli florets for 3-5 minutes until bright green and tender-crisp.\n4. Cook brown rice according to package instructions.\n5. Slice chicken and serve over brown rice with steamed broccoli.'
    },
    {
      _id: ids.recSalmonSweetId,
      name: 'Pan-Seared Salmon with Sweet Potato',
      description: 'Heart-healthy salmon rich in Omega-3 fatty acids paired with nutrient-dense sweet potatoes and spinach.',
      image_url: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&q=80&w=600',
      cooking_time: 30,
      base_servings: 1,
      status: 'published',
      level_cooking: 'medium',
      cooking_step: '1. Clean salmon fillet and pat dry. Season with salt, pepper, and lemon juice.\n2. Bake or boil sweet potato until soft, then mash or slice.\n3. Heat olive oil in a skillet, sear salmon skin-side down for 4 minutes, flip and cook for another 3 minutes.\n4. In the same skillet, quickly wilt the fresh spinach for 1-2 minutes.\n5. Plate the salmon with sweet potato and sautéed spinach.'
    },
    {
      _id: ids.recAvocadoEggId,
      name: 'Healthy Avocado & Egg Toast',
      description: 'A quick, nutrient-packed breakfast providing healthy fats from avocado and high-quality protein from eggs.',
      image_url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&q=80&w=600',
      cooking_time: 15,
      base_servings: 1,
      status: 'published',
      level_cooking: 'easy',
      cooking_step: '1. Toast whole wheat bread slices until golden brown.\n2. Mash avocado with a pinch of salt, pepper, and lime juice.\n3. Fry or poach eggs to your preferred doneness.\n4. Spread mashed avocado evenly onto the toasted bread.\n5. Top with the eggs and sprinkle with red pepper flakes if desired.'
    },
    {
      _id: ids.recBeefSpinachId,
      name: 'Lean Beef & Spinach Stir-Fry',
      description: 'A protein-rich, iron-packed beef stir-fry cooked with fresh spinach and light seasoning.',
      image_url: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&q=80&w=600',
      cooking_time: 20,
      base_servings: 2,
      status: 'published',
      level_cooking: 'medium',
      cooking_step: '1. Slice lean beef into thin strips and marinate with soy sauce and minced garlic.\n2. Heat olive oil in a wok or large pan over high heat.\n3. Add beef and stir-fry quickly for 3-4 minutes until browned.\n4. Toss in fresh spinach and stir-fry for another 2 minutes until wilted.\n5. Serve hot.'
    },
    {
      _id: ids.recTofuVeggieId,
      name: 'Tofu & Veggie Stir-fry',
      description: 'A healthy plant-based meal combining firm tofu, fresh broccoli, and spinach, cooked with minimal oil.',
      image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=600',
      cooking_time: 20,
      base_servings: 1,
      status: 'published',
      level_cooking: 'easy',
      cooking_step: '1. Cut tofu into cubes and pat dry.\n2. Pan-fry tofu cubes in olive oil until golden brown on all sides.\n3. Add broccoli florets and stir-fry for 4 minutes with a splash of water.\n4. Toss in spinach and stir-fry until wilted. Season with low-sodium soy sauce.'
    },
    {
      _id: ids.recOatmealBananaId,
      name: 'Oatmeal with Banana & Milk',
      description: 'A warm, comforting bowl of oats cooked in skim milk and topped with fresh banana slices.',
      image_url: 'https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?auto=format&fit=crop&q=80&w=600',
      cooking_time: 10,
      base_servings: 1,
      status: 'published',
      level_cooking: 'easy',
      cooking_step: '1. In a small pot, combine oats and skim milk.\n2. Cook on medium heat, stirring constantly for 5-7 minutes until thickened.\n3. Pour into a bowl and top with sliced banana.'
    }
  ];
  await mongoose.model('Recipe').insertMany(recipes);
  console.log(`Seeded ${recipes.length} Recipes.`);

  // 13. Seed Recipe Steps
  const recipeSteps = [
    // Grilled Chicken & Broccoli Bowl Steps
    { _id: new mongoose.Types.ObjectId().toString(), recipe_id: ids.recChickenBowlId, step_number: 1, instruction: 'Season the chicken breast with salt and pepper.' },
    { _id: new mongoose.Types.ObjectId().toString(), recipe_id: ids.recChickenBowlId, step_number: 2, instruction: 'Grill the chicken on medium-high heat for 6-8 minutes on each side until fully cooked.' },
    { _id: new mongoose.Types.ObjectId().toString(), recipe_id: ids.recChickenBowlId, step_number: 3, instruction: 'Boil or steam broccoli florets for 3-5 minutes until bright green and tender-crisp.' },
    { _id: new mongoose.Types.ObjectId().toString(), recipe_id: ids.recChickenBowlId, step_number: 4, instruction: 'Cook brown rice according to package instructions.' },
    { _id: new mongoose.Types.ObjectId().toString(), recipe_id: ids.recChickenBowlId, step_number: 5, instruction: 'Slice chicken and serve over brown rice with steamed broccoli.' },

    // Pan-Seared Salmon with Sweet Potato Steps
    { _id: new mongoose.Types.ObjectId().toString(), recipe_id: ids.recSalmonSweetId, step_number: 1, instruction: 'Clean salmon fillet and pat dry. Season with salt, pepper, and lemon juice.' },
    { _id: new mongoose.Types.ObjectId().toString(), recipe_id: ids.recSalmonSweetId, step_number: 2, instruction: 'Bake or boil sweet potato until soft, then mash or slice.' },
    { _id: new mongoose.Types.ObjectId().toString(), recipe_id: ids.recSalmonSweetId, step_number: 3, instruction: 'Heat olive oil in a skillet, sear salmon skin-side down for 4 minutes, flip and cook for another 3 minutes.' },
    { _id: new mongoose.Types.ObjectId().toString(), recipe_id: ids.recSalmonSweetId, step_number: 4, instruction: 'In the same skillet, quickly wilt the fresh spinach for 1-2 minutes.' },
    { _id: new mongoose.Types.ObjectId().toString(), recipe_id: ids.recSalmonSweetId, step_number: 5, instruction: 'Plate the salmon with sweet potato and sautéed spinach.' },

    // Avocado Egg Toast Steps
    { _id: new mongoose.Types.ObjectId().toString(), recipe_id: ids.recAvocadoEggId, step_number: 1, instruction: 'Toast whole wheat bread slices until golden brown.' },
    { _id: new mongoose.Types.ObjectId().toString(), recipe_id: ids.recAvocadoEggId, step_number: 2, instruction: 'Mash avocado with a pinch of salt, pepper, and lime juice.' },
    { _id: new mongoose.Types.ObjectId().toString(), recipe_id: ids.recAvocadoEggId, step_number: 3, instruction: 'Fry or poach eggs to your preferred doneness.' },
    { _id: new mongoose.Types.ObjectId().toString(), recipe_id: ids.recAvocadoEggId, step_number: 4, instruction: 'Spread mashed avocado evenly onto the toasted bread.' },
    { _id: new mongoose.Types.ObjectId().toString(), recipe_id: ids.recAvocadoEggId, step_number: 5, instruction: 'Top with the eggs and sprinkle with red pepper flakes if desired.' },
  ];
  await mongoose.model('RecipeStep').insertMany(recipeSteps);
  console.log(`Seeded ${recipeSteps.length} RecipeSteps.`);

  // 14. Seed Recipe Ingredients
  const recipeIngredients = [
    // Grilled Chicken & Broccoli Bowl: Chicken Breast 150g, Brown Rice 100g, Broccoli 100g, Olive Oil 10g
    { _id: new mongoose.Types.ObjectId().toString(), recipe_id: ids.recChickenBowlId, ingredient_id: ids.ingChickenId, base_quantity: 150, unit: 'g' },
    { _id: new mongoose.Types.ObjectId().toString(), recipe_id: ids.recChickenBowlId, ingredient_id: ids.ingBrownRiceId, base_quantity: 100, unit: 'g' },
    { _id: new mongoose.Types.ObjectId().toString(), recipe_id: ids.recChickenBowlId, ingredient_id: ids.ingBroccoliId, base_quantity: 100, unit: 'g' },
    { _id: new mongoose.Types.ObjectId().toString(), recipe_id: ids.recChickenBowlId, ingredient_id: ids.ingOliveOilId, base_quantity: 10, unit: 'g' },

    // Pan-Seared Salmon with Sweet Potato: Salmon 150g, Sweet Potato 150g, Spinach 100g, Olive Oil 10g
    { _id: new mongoose.Types.ObjectId().toString(), recipe_id: ids.recSalmonSweetId, ingredient_id: ids.ingSalmonId, base_quantity: 150, unit: 'g' },
    { _id: new mongoose.Types.ObjectId().toString(), recipe_id: ids.recSalmonSweetId, ingredient_id: ids.ingSweetPotatoId, base_quantity: 150, unit: 'g' },
    { _id: new mongoose.Types.ObjectId().toString(), recipe_id: ids.recSalmonSweetId, ingredient_id: ids.ingSpinachId, base_quantity: 100, unit: 'g' },
    { _id: new mongoose.Types.ObjectId().toString(), recipe_id: ids.recSalmonSweetId, ingredient_id: ids.ingOliveOilId, base_quantity: 10, unit: 'g' },

    // Avocado & Egg Toast: Whole Wheat Bread 100g, Eggs 100g (2 pieces), Avocado 80g
    { _id: new mongoose.Types.ObjectId().toString(), recipe_id: ids.recAvocadoEggId, ingredient_id: ids.ingBreadId, base_quantity: 100, unit: 'g' },
    { _id: new mongoose.Types.ObjectId().toString(), recipe_id: ids.recAvocadoEggId, ingredient_id: ids.ingEggId, base_quantity: 100, unit: 'g' },
    { _id: new mongoose.Types.ObjectId().toString(), recipe_id: ids.recAvocadoEggId, ingredient_id: ids.ingAvocadoId, base_quantity: 80, unit: 'g' },

    // Lean Beef & Spinach Stir-Fry: Lean Beef 250g, Spinach 200g, Olive Oil 15g
    { _id: new mongoose.Types.ObjectId().toString(), recipe_id: ids.recBeefSpinachId, ingredient_id: ids.ingBeefId, base_quantity: 250, unit: 'g' },
    { _id: new mongoose.Types.ObjectId().toString(), recipe_id: ids.recBeefSpinachId, ingredient_id: ids.ingSpinachId, base_quantity: 200, unit: 'g' },
    { _id: new mongoose.Types.ObjectId().toString(), recipe_id: ids.recBeefSpinachId, ingredient_id: ids.ingOliveOilId, base_quantity: 15, unit: 'g' },

    // Tofu & Veggie Stir-fry: Tofu 150g, Broccoli 100g, Spinach 100g, Olive Oil 10g
    { _id: new mongoose.Types.ObjectId().toString(), recipe_id: ids.recTofuVeggieId, ingredient_id: ids.ingTofuId, base_quantity: 150, unit: 'g' },
    { _id: new mongoose.Types.ObjectId().toString(), recipe_id: ids.recTofuVeggieId, ingredient_id: ids.ingBroccoliId, base_quantity: 100, unit: 'g' },
    { _id: new mongoose.Types.ObjectId().toString(), recipe_id: ids.recTofuVeggieId, ingredient_id: ids.ingSpinachId, base_quantity: 100, unit: 'g' },
    { _id: new mongoose.Types.ObjectId().toString(), recipe_id: ids.recTofuVeggieId, ingredient_id: ids.ingOliveOilId, base_quantity: 10, unit: 'g' },

    // Oatmeal with Banana & Milk: Oats 50g, Skim Milk 200g, Banana 100g
    { _id: new mongoose.Types.ObjectId().toString(), recipe_id: ids.recOatmealBananaId, ingredient_id: ids.ingOatsId, base_quantity: 50, unit: 'g' },
    { _id: new mongoose.Types.ObjectId().toString(), recipe_id: ids.recOatmealBananaId, ingredient_id: ids.ingMilkId, base_quantity: 200, unit: 'g' },
    { _id: new mongoose.Types.ObjectId().toString(), recipe_id: ids.recOatmealBananaId, ingredient_id: ids.ingBananaId, base_quantity: 100, unit: 'g' },
  ];
  await mongoose.model('RecipeIngredient').insertMany(recipeIngredients);
  console.log(`Seeded ${recipeIngredients.length} RecipeIngredients.`);

  // 15. Seed Recipe Nutrition (accurately matching sum of recipe ingredients)
  const recipeNutritionList = [
    {
      _id: new mongoose.Types.ObjectId().toString(),
      recipe_id: ids.recChickenBowlId,
      calories: 481,
      protein: 52,
      fat: 17,
      carbs: 30
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      recipe_id: ids.recSalmonSweetId,
      calories: 552,
      protein: 35,
      fat: 30,
      carbs: 34
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      recipe_id: ids.recAvocadoEggId,
      calories: 685,
      protein: 41,
      fat: 37,
      carbs: 50
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      recipe_id: ids.recBeefSpinachId,
      calories: 804,
      protein: 71,
      fat: 53,
      carbs: 7
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      recipe_id: ids.recTofuVeggieId,
      calories: 259,
      protein: 18,
      fat: 18,
      carbs: 13
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      recipe_id: ids.recOatmealBananaId,
      calories: 354,
      protein: 16,
      fat: 4,
      carbs: 66
    }
  ];
  await mongoose.model('RecipeNutrition').insertMany(recipeNutritionList);
  console.log(`Seeded ${recipeNutritionList.length} RecipeNutrition entries.`);

  // 16. Seed Recipe Micronutrient Values
  const recipeMicronutrientValues = [
    // Chicken Bowl micronutrients
    { _id: new mongoose.Types.ObjectId().toString(), recipe_id: ids.recChickenBowlId, micronutrient_id: ids.microProteinId, amount: 52 },
    { _id: new mongoose.Types.ObjectId().toString(), recipe_id: ids.recChickenBowlId, micronutrient_id: ids.microVitaminCId, amount: 89 },
    { _id: new mongoose.Types.ObjectId().toString(), recipe_id: ids.recChickenBowlId, micronutrient_id: ids.microIronId, amount: 2.2 },
    { _id: new mongoose.Types.ObjectId().toString(), recipe_id: ids.recChickenBowlId, micronutrient_id: ids.microSodiumId, amount: 144 },

    // Salmon with Sweet Potato micronutrients
    { _id: new mongoose.Types.ObjectId().toString(), recipe_id: ids.recSalmonSweetId, micronutrient_id: ids.microProteinId, amount: 35 },
    { _id: new mongoose.Types.ObjectId().toString(), recipe_id: ids.recSalmonSweetId, micronutrient_id: ids.microVitaminCId, amount: 28 },
    { _id: new mongoose.Types.ObjectId().toString(), recipe_id: ids.recSalmonSweetId, micronutrient_id: ids.microIronId, amount: 3.2 },
  ];
  await mongoose.model('RecipeMicronutrientValue').insertMany(recipeMicronutrientValues);
  console.log(`Seeded ${recipeMicronutrientValues.length} RecipeMicronutrientValues.`);

  // 17. Seed Recipe Reviews
  const recipeReviews = [
    { _id: new mongoose.Types.ObjectId().toString(), user_id: ids.custUser1Id, recipe_id: ids.recChickenBowlId, rating: 5, comment: 'Very easy to make, and tastes clean!' },
    { _id: new mongoose.Types.ObjectId().toString(), user_id: ids.custUser2Id, recipe_id: ids.recChickenBowlId, rating: 4, comment: 'Good healthy carbs and protein source.' },
    { _id: new mongoose.Types.ObjectId().toString(), user_id: ids.custUser3Id, recipe_id: ids.recSalmonSweetId, rating: 5, comment: 'Perfect dinner, salmon was tender.' },
  ];
  await mongoose.model('RecipeReview').insertMany(recipeReviews);
  console.log(`Seeded ${recipeReviews.length} RecipeReviews.`);

  // 18. Seed Consultation Contracts
  const consultationContracts = [
    { _id: ids.contract1Id, user_id: ids.custUser1Id, nutritionists_id: 'active', create_at: now },
    { _id: ids.contract2Id, user_id: ids.custUser2Id, nutritionists_id: 'completed', create_at: new Date(now.getTime() - 7*24*60*60*1000) },
    { _id: ids.contract3Id, user_id: ids.custUser3Id, nutritionists_id: 'pending_payment', create_at: now },
  ];
  await mongoose.model('ConsultationContract').insertMany(consultationContracts);
  console.log(`Seeded ${consultationContracts.length} ConsultationContracts.`);

  // 19. Seed Consultation Messages
  const consultationMessages = [
    {
      _id: new mongoose.Types.ObjectId().toString(),
      contract_id: ids.contract1Id,
      sender_id: ids.nutriUser1Id,
      messages_type: 'text',
      content: 'Hello, welcome to your nutrition plan. I have created a low glycemic diet for you due to your Type 2 Diabetes.',
      create_at: now
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      contract_id: ids.contract1Id,
      sender_id: ids.custUser1Id,
      messages_type: 'text',
      content: 'Thank you doctor! I will follow the plan and record my meals.',
      create_at: now
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      contract_id: ids.contract2Id,
      sender_id: ids.nutriUser2Id,
      messages_type: 'text',
      content: 'Let me know if you need to adjust your calories for muscle building.',
      create_at: new Date(now.getTime() - 6*24*60*60*1000)
    }
  ];
  await mongoose.model('ConsultationMessage').insertMany(consultationMessages);
  console.log(`Seeded ${consultationMessages.length} ConsultationMessages.`);

  // 20. Seed Nutrition Assessments
  const assessments = [
    {
      _id: new mongoose.Types.ObjectId().toString(),
      user_id: ids.custUser1Id,
      nutritionist_id: ids.nutri1Id,
      diagnosis: 'Type 2 Diabetes with mild overweight.',
      recommendations: 'Prioritize low glycemic carbs, high fiber vegetable foods, lean proteins. Limit snacking and sugary beverages.',
      notes: 'Customer reports low energy in afternoons. Advised split meals.'
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      user_id: ids.custUser2Id,
      nutritionist_id: ids.nutri2Id,
      diagnosis: 'Ectomorph body type seeking lean muscle gain.',
      recommendations: 'Increase daily TDEE target to 2900 kcal. Ensure 1.8g protein per kg of bodyweight.',
      notes: 'Active gym goer (4 times a week).'
    }
  ];
  await mongoose.model('NutritionAssessment').insertMany(assessments);
  console.log(`Seeded ${assessments.length} NutritionAssessments.`);

  // 21. Seed Meal Plans
  const mealPlans = [
    {
      _id: new mongoose.Types.ObjectId().toString(),
      user_id: ids.custUser1Id,
      nutritionist_id: ids.nutri1Id,
      date: now,
      created_by: 'doctor.kien@wealthyeater.com'
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      user_id: ids.custUser2Id,
      nutritionist_id: ids.nutri2Id,
      date: now,
      created_by: 'doctor.linh@wealthyeater.com'
    }
  ];
  await mongoose.model('MealPlan').insertMany(mealPlans);
  console.log(`Seeded ${mealPlans.length} MealPlans.`);

  const seededMealPlans = await mongoose.model('MealPlan').find({}).lean();
  const mealPlanMap = {};
  for (const mp of seededMealPlans) {
    mealPlanMap[mp.user_id] = mp._id;
  }

  // 22. Seed Meal Plan Items
  const mealPlanItems = [
    // Customer 1: Diabetes plan (Low glycemic meals like chicken bowl and salmon sweet potato)
    { _id: new mongoose.Types.ObjectId().toString(), meal_plan_id: mealPlanMap[ids.custUser1Id], recipe_id: ids.recChickenBowlId, meal_type: 'lunch' },
    { _id: new mongoose.Types.ObjectId().toString(), meal_plan_id: mealPlanMap[ids.custUser1Id], recipe_id: ids.recSalmonSweetId, meal_type: 'dinner' },

    // Customer 2: Muscle gain plan
    { _id: new mongoose.Types.ObjectId().toString(), meal_plan_id: mealPlanMap[ids.custUser2Id], recipe_id: ids.recAvocadoEggId, meal_type: 'breakfast' },
    { _id: new mongoose.Types.ObjectId().toString(), meal_plan_id: mealPlanMap[ids.custUser2Id], recipe_id: ids.recBeefSpinachId, meal_type: 'lunch' },
    { _id: new mongoose.Types.ObjectId().toString(), meal_plan_id: mealPlanMap[ids.custUser2Id], recipe_id: ids.recChickenBowlId, meal_type: 'dinner' },
  ];
  await mongoose.model('MealPlanItem').insertMany(mealPlanItems);
  console.log(`Seeded ${mealPlanItems.length} MealPlanItems.`);

  // 23. Seed Customer Meal Logs
  const customerMealLogs = [
    {
      _id: new mongoose.Types.ObjectId().toString(),
      user_id: ids.custUser1Id,
      recipe_id: ids.recChickenBowlId,
      actual_weight_gram: 400,
      actual_calories: 520, // targeted: 481 (exceeded, deviation!)
      deviation_flag: true,
      create_at: now
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      user_id: ids.custUser2Id,
      recipe_id: ids.recAvocadoEggId,
      actual_weight_gram: 280,
      actual_calories: 685, // perfectly on target
      deviation_flag: false,
      create_at: now
    }
  ];
  await mongoose.model('CustomerMealLog').insertMany(customerMealLogs);
  console.log(`Seeded ${customerMealLogs.length} CustomerMealLogs.`);

  const seededMealLogs = await mongoose.model('CustomerMealLog').find({}).lean();
  const mealLogMap = {};
  for (const log of seededMealLogs) {
    mealLogMap[log.user_id] = log._id;
  }

  // 24. Seed Macro Deviation Flags
  const macroDeviationFlags = [
    {
      _id: new mongoose.Types.ObjectId().toString(),
      customer_meal_log: mealLogMap[ids.custUser1Id],
      contract_id: ids.contract1Id,
      calculated_delta_calories: 39,
      nutritionist_review: 'Slight calorie excess due to larger portion. Monitor closely, try to stay within target portion size next time.',
      create_at: now
    }
  ];
  await mongoose.model('MacroDeviationFlag').insertMany(macroDeviationFlags);
  console.log(`Seeded ${macroDeviationFlags.length} MacroDeviationFlags.`);

  // 25. Seed Shopping List
  const shoppingLists = [
    {
      _id: new mongoose.Types.ObjectId().toString(),
      user_id: ids.custUser1Id,
      ingredient_id: ids.ingChickenId,
      ingredient_name: 'Chicken Breast',
      recipe_id: ids.recChickenBowlId,
      is_purchase: false,
      category: 'Meat/Protein',
      add_at: now,
      creat_at: now
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      user_id: ids.custUser1Id,
      ingredient_id: ids.ingBroccoliId,
      ingredient_name: 'Broccoli',
      recipe_id: ids.recChickenBowlId,
      is_purchase: true,
      category: 'Vegetables',
      add_at: now,
      creat_at: now
    }
  ];
  await mongoose.model('ShoppingList').insertMany(shoppingLists);
  console.log(`Seeded ${shoppingLists.length} ShoppingLists.`);

  // 26. Seed Transactions
  const transactions = [
    {
      _id: new mongoose.Types.ObjectId().toString(),
      consultation_contracts_id_fk: ids.contract1Id,
      payos_order_code: 'ORD172839210',
      payos_transaction_id: 'TXN839210293',
      payos_payment_link: 'https://pay.payos.vn/web/ORD172839210',
      payos_qr_code: 'https://pay.payos.vn/qr/ORD172839210',
      amount_gross: 200000,
      platform_fee: 20000,
      expert_payout: 180000
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      consultation_contracts_id_fk: ids.contract2Id,
      payos_order_code: 'ORD172839005',
      payos_transaction_id: 'TXN839210005',
      payos_payment_link: 'https://pay.payos.vn/web/ORD172839005',
      payos_qr_code: 'https://pay.payos.vn/qr/ORD172839005',
      amount_gross: 250000,
      platform_fee: 25000,
      expert_payout: 225000
    }
  ];
  await mongoose.model('Transaction').insertMany(transactions);
  console.log(`Seeded ${transactions.length} Transactions.`);

  // 27. Seed Audit Logs
  const auditLogs = [
    {
      _id: new mongoose.Types.ObjectId().toString(),
      user_id: ids.adminUserId,
      action: 'APPROVE_NUTRITIONIST',
      description: 'Approved nutritionist application for Dr. Kien Nguyen.',
      created_at: new Date(now.getTime() - 2*24*60*60*1000)
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      user_id: ids.adminUserId,
      action: 'APPROVE_NUTRITIONIST',
      description: 'Approved nutritionist application for Dr. Linh Tran.',
      created_at: new Date(now.getTime() - 2*24*60*60*1000)
    }
  ];
  await mongoose.model('AuditLog').insertMany(auditLogs);
  console.log(`Seeded ${auditLogs.length} AuditLogs.`);
}

async function validateAndWriteManifest() {
  const modelNames = mongoose.modelNames();
  const counts = {};
  for (const m of modelNames) {
    counts[m] = await mongoose.model(m).countDocuments();
  }

  const sampleIds = {};
  const sampleModels = ['User', 'Recipe', 'Ingredient', 'Nutritionist', 'ConsultationContract'];
  for (const m of sampleModels) {
    if (!modelNames.includes(m)) continue;
    const docs = await mongoose.model(m).find({}).limit(5).lean();
    sampleIds[m] = docs.map((d) => d._id);
  }

  const validations = [];
  const checks = {
    Nutritionist: [{ field: 'user_id', ref: 'User' }],
    UserProfile: [{ field: 'user_id', ref: 'User' }],
    UserDietary: [{ field: 'user_id', ref: 'User' }, { field: 'medical_condition_id', ref: 'MedicalCondition' }],
    RecipeStep: [{ field: 'recipe_id', ref: 'Recipe' }],
    RecipeIngredient: [{ field: 'recipe_id', ref: 'Recipe' }, { field: 'ingredient_id', ref: 'Ingredient' }],
    RecipeNutrition: [{ field: 'recipe_id', ref: 'Recipe' }],
    RecipeMicronutrientValue: [{ field: 'recipe_id', ref: 'Recipe' }, { field: 'micronutrient_id', ref: 'Micronutrient' }],
    IngredientMicronutrientValue: [{ field: 'ingredient_id', ref: 'Ingredient' }, { field: 'micronutrient_id', ref: 'Micronutrient' }],
    NutritionAssessment: [{ field: 'user_id', ref: 'User' }, { field: 'nutritionist_id', ref: 'Nutritionist' }],
    MealPlan: [{ field: 'user_id', ref: 'User' }, { field: 'nutritionist_id', ref: 'Nutritionist' }],
    MealPlanItem: [{ field: 'meal_plan_id', ref: 'MealPlan' }, { field: 'recipe_id', ref: 'Recipe' }],
    ConsultationContract: [{ field: 'user_id', ref: 'User' }],
    ConsultationMessage: [{ field: 'contract_id', ref: 'ConsultationContract' }, { field: 'sender_id', ref: 'User' }],
    CustomerMealLog: [{ field: 'user_id', ref: 'User' }, { field: 'recipe_id', ref: 'Recipe' }],
    MacroDeviationFlag: [{ field: 'customer_meal_log', ref: 'CustomerMealLog' }, { field: 'contract_id', ref: 'ConsultationContract' }],
    ShoppingList: [{ field: 'user_id', ref: 'User' }, { field: 'ingredient_id', ref: 'Ingredient' }, { field: 'recipe_id', ref: 'Recipe' }],
    RecipeReview: [{ field: 'user_id', ref: 'User' }, { field: 'recipe_id', ref: 'Recipe' }],
    Transaction: [{ field: 'consultation_contracts_id_fk', ref: 'ConsultationContract' }],
  };

  const SAMPLE_LIMIT = 50;
  for (const [model, rules] of Object.entries(checks)) {
    if (!modelNames.includes(model)) continue;
    const docs = await mongoose.model(model).find({}).limit(SAMPLE_LIMIT).lean();
    for (const rule of rules) {
      let missing = 0;
      const examples = [];
      for (const doc of docs) {
        const val = doc[rule.field];
        if (!val) continue;
        const exists = await mongoose.model(rule.ref).exists({ _id: val });
        if (!exists) {
          missing++;
          if (examples.length < 5) examples.push({ docId: doc._id, missingRef: val });
        }
      }
      validations.push({ model, field: rule.field, ref: rule.ref, checked: docs.length, missing, examples });
    }
  }

  const manifest = {
    generated_at: new Date().toISOString(),
    scale: 'realistic-curated',
    counts,
    sampleIds,
    validations,
  };

  const manifestText = JSON.stringify(manifest, null, 2);
  const sha = crypto.createHash('sha256').update(manifestText).digest('hex');
  const out = { manifest, sha };
  const outPath = path.join(__dirname, `seed-manifest-${Date.now()}.json`);
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log('Wrote manifest:', outPath, 'sha256:', sha);
}

async function run() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('MONGODB_URI not set in .env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  loadModels();
  await ensureCollections();
  await seedAllModels();

  await validateAndWriteManifest();

  await mongoose.disconnect();
  console.log('Seed completed successfully');
}

run().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});