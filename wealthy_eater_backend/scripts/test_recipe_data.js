require('dotenv').config();
const mongoose = require('mongoose');

// Because we need to load models first, I'll add the model loading utility
const fs = require('fs');
const path = require('path');
const modelsDir = path.join(__dirname, '../src/models');

function loadModels() {
  const modelFiles = fs
    .readdirSync(modelsDir)
    .filter((file) => file.endsWith('.js'));
  for (const file of modelFiles) {
    require(path.join(modelsDir, file));
  }
}

async function auditRecipes() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Load all models dynamically to avoid missing schemas
    loadModels();
    
    const Recipe = mongoose.model('Recipe');
    const Ingredient = mongoose.model('Ingredient');
    const RecipeIngredient = mongoose.model('RecipeIngredient');
    const RecipeNutrition = mongoose.model('RecipeNutrition');
    const RecipeStep = mongoose.model('RecipeStep');
    const Micronutrient = mongoose.model('Micronutrient');
    const RecipeMicronutrientValue = mongoose.model('RecipeMicronutrientValue');

    console.log('🔍 Bắt đầu kiểm tra toàn bộ dữ liệu Recipe trong Database...\n');

    const recipes = await Recipe.find();
    console.log(`📊 Tìm thấy tổng cộng: ${recipes.length} Recipes.`);

    let perfectCount = 0;
    let issuesFound = 0;

    for (let i = 0; i < recipes.length; i++) {
      const recipe = recipes[i];
      console.log(`\n---------------------------------------------------------`);
      console.log(`[${i + 1}/${recipes.length}] 🍲 ${recipe.name}`);
      console.log(`---------------------------------------------------------`);

      const errors = [];
      const warnings = [];

      // 1. Check Nutrition
      const nutrition = await RecipeNutrition.findOne({ recipe_id: recipe._id });
      if (!nutrition) {
        errors.push('❌ Thiếu RecipeNutrition (Macro cơ bản).');
      }

      // 2. Check Ingredients
      const recipeIngredients = await RecipeIngredient.find({ recipe_id: recipe._id });
      if (recipeIngredients.length === 0) {
        errors.push('❌ Thiếu RecipeIngredient (Không có nguyên liệu).');
      }

      let calcCals = 0, calcPro = 0, calcFat = 0, calcCarbs = 0;
      
      for (const ri of recipeIngredients) {
        const ing = await Ingredient.findById(ri.ingredient_id);
        if (!ing) {
          errors.push(`❌ Không tìm thấy Ingredient ID: ${ri.ingredient_id} trong DB.`);
        } else {
          calcCals += ing.calories_per_unit * ri.base_quantity;
          calcPro += ing.protein * ri.base_quantity;
          calcFat += ing.fat * ri.base_quantity;
          calcCarbs += ing.carbs * ri.base_quantity;
        }
      }

      // 3. Verify Macro Integrity
      if (nutrition && recipeIngredients.length > 0) {
        // Allow a 5% margin of error due to rounding
        const isMatch = (val1, val2) => Math.abs(val1 - val2) <= Math.max(5, val1 * 0.05);
        
        if (!isMatch(nutrition.calories, calcCals)) warnings.push(`⚠️ Calories lệch (Lưu: ${nutrition.calories}, Tính toán: ${Math.round(calcCals)})`);
        if (!isMatch(nutrition.protein, calcPro)) warnings.push(`⚠️ Protein lệch (Lưu: ${nutrition.protein}, Tính toán: ${Math.round(calcPro)})`);
        if (!isMatch(nutrition.fat, calcFat)) warnings.push(`⚠️ Fat lệch (Lưu: ${nutrition.fat}, Tính toán: ${Math.round(calcFat)})`);
        if (!isMatch(nutrition.carbs, calcCarbs)) warnings.push(`⚠️ Carbs lệch (Lưu: ${nutrition.carbs}, Tính toán: ${Math.round(calcCarbs)})`);
      }

      // 4. Check Steps
      const steps = await RecipeStep.find({ recipe_id: recipe._id });
      if (steps.length === 0) {
        errors.push('❌ Thiếu RecipeStep (Không có hướng dẫn nấu).');
      } else if (!recipe.cooking_step) {
        warnings.push('⚠️ Có RecipeStep nhưng bị thiếu chuỗi cooking_step (cho UI hiển thị nhanh).');
      }

      // 5. Check Micronutrients
      const micros = await RecipeMicronutrientValue.find({ recipe_id: recipe._id });
      if (micros.length === 0) {
        warnings.push('💡 Không có RecipeMicronutrientValue (Vi chất). (Chấp nhận được nếu không phải là Perfect Recipe).');
      } else {
        for (const m of micros) {
          const microInfo = await Micronutrient.findById(m.micronutrient_id);
          if (!microInfo) errors.push(`❌ Lỗi vi chất: Không tìm thấy Micronutrient ID ${m.micronutrient_id}`);
        }
      }

      // Print Results
      if (errors.length === 0 && warnings.length === 0) {
        console.log('✅ TRẠNG THÁI: HOÀN HẢO (Perfect). Toàn bộ liên kết, Macro và Dữ liệu khớp 100%.');
        console.log(`   - Nguyên liệu: ${recipeIngredients.length} món`);
        console.log(`   - Bước nấu: ${steps.length} bước`);
        console.log(`   - Vi chất: ${micros.length} loại`);
        console.log(`   - Kcal tính toán: ${Math.round(calcCals)} kcal | P: ${Math.round(calcPro)}g | F: ${Math.round(calcFat)}g | C: ${Math.round(calcCarbs)}g`);
        perfectCount++;
      } else {
        console.log('⚠️ TRẠNG THÁI: CÓ VẤN ĐỀ.');
        errors.forEach(e => console.log('   ' + e));
        warnings.forEach(w => console.log('   ' + w));
        issuesFound++;
      }
    }

    console.log('\n=========================================================');
    console.log('🏆 BÁO CÁO TỔNG KẾT');
    console.log('=========================================================');
    console.log(`Tổng số Recipe đã kiểm tra : ${recipes.length}`);
    console.log(`✅ Recipe Hoàn hảo         : ${perfectCount}`);
    console.log(`⚠️ Recipe Cần xem lại      : ${issuesFound}`);
    console.log('=========================================================');

    process.exit(0);
  } catch (err) {
    console.error('Lỗi khi kiểm tra:', err);
    process.exit(1);
  }
}

auditRecipes();
