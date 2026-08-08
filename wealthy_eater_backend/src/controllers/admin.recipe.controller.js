/**
 * Admin Recipe Controller - UC-71 to UC-76
 * API para listar, criar, editar, deletar e importar receitas do sistema com paginação e filtros
 */

const AppError = require('../utils/AppError');
const mongoose = require('mongoose');
const xlsx = require('xlsx');
const Recipe = require('../models/Recipe');
const RecipeNutrition = require('../models/RecipeNutrition');
const RecipeIngredient = require('../models/RecipeIngredient');
const RecipeStep = require('../models/RecipeStep');
const RecipeReview = require('../models/RecipeReview');
const Ingredient = require('../models/Ingredient');
const User = require('../models/User');

const { uploadBase64ToCloudinary } = require('../config/cloudinary.config');

/**
 * Escapa caracteres especiais para regex seguro
 */
function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Constrói filtro MongoDB baseado em query parameters
 */
function buildAdminFilter(query) {
  const filter = {};

  if (query.search) {
    const searchTerm = escapeRegex(String(query.search).trim());
    filter.$or = [
      { name: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } },
      { level_cooking: { $regex: searchTerm, $options: 'i' } },
    ];
  }

  // Lọc status: Nếu truyền status cụ thể khác 'all' thì lọc theo status đó
  if (query.status && query.status.trim() !== '' && query.status.toLowerCase() !== 'all') {
    filter.status = { $regex: `^${escapeRegex(String(query.status).trim())}$`, $options: 'i' };
  } else {
    // Nếu chọn 'All' hoặc không truyền status -> Lấy tất cả ngoại trừ món đã xóa mềm ('archived')
    filter.status = { $ne: 'archived' };
  }

  if (query.level && query.level.trim() !== '' && query.level.toLowerCase() !== 'all') {
    filter.level_cooking = { $regex: `^${escapeRegex(String(query.level).trim())}$`, $options: 'i' };
  }

  if (query.minTime || query.maxTime) {
    filter.cooking_time = {};
    if (query.minTime) {
      filter.cooking_time.$gte = Number(query.minTime);
    }
    if (query.maxTime) {
      filter.cooking_time.$lte = Number(query.maxTime);
    }
  }

  return filter;
}

/**
 * Helper: Lê e converte ingredientes para RecipeIngredientDocs, calculando a nutrição no processo.
 */
async function processRecipeIngredients(recipeId, ingredientsInput) {
  let totalCalories = 0, totalProtein = 0, totalFat = 0, totalCarbs = 0;
  const recipeIngredientDocs = [];

  if (!ingredientsInput || !Array.isArray(ingredientsInput) || ingredientsInput.length === 0) {
    return { recipeIngredientDocs, nutrition: { calories: 0, protein: 0, fat: 0, carbs: 0 } };
  }

  const ingredientIds = ingredientsInput.map(i => i.ingredient_id).filter(id => id && mongoose.Types.ObjectId.isValid(id));
  const ingredientDataList = await Ingredient.find({ _id: { $in: ingredientIds } }).lean();

  const ingredientMap = {};
  for (const data of ingredientDataList) {
    ingredientMap[data._id.toString()] = data;
  }

  for (const item of ingredientsInput) {
    const ingredientData = ingredientMap[item.ingredient_id];
    if (!ingredientData) continue;

    const quantity = Number(item.base_quantity) || 0;
    totalCalories += ((ingredientData.calories_per_unit || 0) * quantity) / 100;
    totalProtein += ((ingredientData.protein || 0) * quantity) / 100;
    totalFat += ((ingredientData.fat || 0) * quantity) / 100;
    totalCarbs += ((ingredientData.carbs || 0) * quantity) / 100;

    recipeIngredientDocs.push({
      recipe_id: recipeId,
      ingredient_id: item.ingredient_id,
      base_quantity: quantity,
      unit: item.unit || ingredientData.unit || 'g',
    });
  }

  return {
    recipeIngredientDocs,
    nutrition: {
      calories: Math.round(totalCalories * 10) / 10,
      protein: Math.round(totalProtein * 10) / 10,
      fat: Math.round(totalFat * 10) / 10,
      carbs: Math.round(totalCarbs * 10) / 10,
    }
  };
}

/**
 * Mapeia dados da receita para o formato retornado chuẩn Frontend
 */
function mapRecipeForAdmin(recipe, nutrition, reviewStats, ingredientsCount, stepsCount, ingredientsList = [], stepsList = []) {
  return {
    id: recipe._id,
    name: recipe.name,
    description: recipe.description || '',
    imageUrl: recipe.image_url || '',
    cookingTime: recipe.cooking_time || 0,
    baseServings: recipe.base_servings || 1,
    status: recipe.status || 'unknown',
    levelCooking: recipe.level_cooking || 'unknown',
    cookingStep: recipe.cooking_step || '',
    createdAt: recipe.createdAt || new Date(),
    updatedAt: recipe.updatedAt || new Date(),
    nutrition: nutrition ? {
      calories: nutrition.calories || 0,
      protein: nutrition.protein || 0,
      fat: nutrition.fat || 0,
      carbs: nutrition.carbs || 0,
    } : null,
    reviewStats: {
      averageRating: reviewStats?.count ? Number((reviewStats.avgRating || 0).toFixed(1)) : 0,
      reviewCount: reviewStats?.count || 0,
    },
    ingredientsCount: ingredientsCount || 0,
    stepsCount: stepsCount || 0,
    ingredients: ingredientsList,
    steps: stepsList
  };
}

/**
 * UC-71: GET /api/admin/recipes
 */
async function getRecipesList(req, res, next) {
  try {
    // 🔴 BẮT BUỘC TRÌNH DUYỆT BỎ CACHE CHO API NÀY
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const filter = buildAdminFilter(req.query || {});

    if (req.query.minCalories || req.query.maxCalories) {
      const nutritionFilter = {};
      if (req.query.minCalories) nutritionFilter.calories = { $gte: Number(req.query.minCalories) };
      if (req.query.maxCalories) {
        nutritionFilter.calories = { ...(nutritionFilter.calories || {}), $lte: Number(req.query.maxCalories) };
      }
      const matchedNutritions = await RecipeNutrition.find(nutritionFilter).select('recipe_id').lean();
      filter._id = { $in: matchedNutritions.map(n => n.recipe_id) };
    }

    let sortObj = { createdAt: -1, _id: -1 };
    const sortBy = req.query.sortBy || 'newest';
    switch (sortBy) {
      case 'name_asc': sortObj = { name: 1 }; break;
      case 'name_desc': sortObj = { name: -1 }; break;
      case 'time_asc': sortObj = { cooking_time: 1 }; break;
      case 'time_desc': sortObj = { cooking_time: -1 }; break;
      case 'oldest': sortObj = { createdAt: 1 }; break;
      case 'newest': default: sortObj = { createdAt: -1, _id: -1 }; break;
    }

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 5000);
    const skip = (page - 1) * limit;

    // ĐÃ FIX CÚ PHÁP QUERY MONGOOSE (SỬ DỤNG .read('primary'))
    const [recipes, total] = await Promise.all([
      Recipe.find(filter).read('primary').sort(sortObj).skip(skip).limit(limit).lean(),
      Recipe.countDocuments(filter),
    ]);

    if (recipes.length === 0) {
      return res.json({ success: true, message: 'No recipes found', data: [], meta: { page, limit, total, totalPages: 0, hasNextPage: false, hasPrevPage: false } });
    }

    const recipeIds = recipes.map(r => r._id);
    const [nutritions, reviewStats, ingredientCounts, stepCounts] = await Promise.all([
      RecipeNutrition.find({ recipe_id: { $in: recipeIds } }).lean(),
      RecipeReview.aggregate([{ $match: { recipe_id: { $in: recipeIds } } }, { $group: { _id: '$recipe_id', count: { $sum: 1 }, avgRating: { $avg: '$rating' } } }]),
      RecipeIngredient.aggregate([{ $match: { recipe_id: { $in: recipeIds } } }, { $group: { _id: '$recipe_id', count: { $sum: 1 } } }]),
      RecipeStep.aggregate([{ $match: { recipe_id: { $in: recipeIds } } }, { $group: { _id: '$recipe_id', count: { $sum: 1 } } }]),
    ]);

    const nutritionMap = {}, reviewMap = {}, ingredientMap = {}, stepMap = {};
    nutritions.forEach(n => { nutritionMap[n.recipe_id] = n; });
    reviewStats.forEach(r => { reviewMap[r._id] = r; });
    ingredientCounts.forEach(i => { ingredientMap[i._id] = i.count; });
    stepCounts.forEach(s => { stepMap[s._id] = s.count; });

    const data = recipes.map(recipe =>
      mapRecipeForAdmin(
        recipe,
        nutritionMap[recipe._id] || null,
        reviewMap[recipe._id] || null,
        ingredientMap[recipe._id] || 0,
        stepMap[recipe._id] || 0
      )
    );

    const totalPages = Math.ceil(total / limit);
    return res.json({ success: true, message: 'Recipes loaded successfully', data, meta: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 } });
  } catch (err) {
    console.error('❌ Error fetching recipes:', err);
    return next(new AppError(err.message || 'Failed to load recipes', 500, null, process.env.NODE_ENV === 'development' ? err.stack : undefined));
  }
}

/**
 * UC-71: GET /api/admin/recipes/stats
 */
async function getRecipesStats(req, res, next) {
  try {
    const [totalRecipes, publishedRecipes, draftRecipes, totalReviews, avgRating, topRecipeByRating, totalUsers] = await Promise.all([
      Recipe.countDocuments({ status: { $ne: 'archived' } }),
      Recipe.countDocuments({ status: 'published' }),
      Recipe.countDocuments({ status: 'draft' }),
      RecipeReview.countDocuments({}),
      RecipeReview.aggregate([{ $group: { _id: null, avgRating: { $avg: '$rating' } } }]),
      RecipeReview.aggregate([{ $group: { _id: '$recipe_id', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }, { $sort: { avgRating: -1 } }, { $limit: 1 }, { $lookup: { from: 'recipes', localField: '_id', foreignField: '_id', as: 'recipe' } }]),
      User.countDocuments({}),
    ]);

    const stats = {
      totalRecipes, 
      publishedRecipes, 
      draftRecipes, 
      totalReviews,
      totalUsers,
      averageRating: avgRating[0]?.avgRating ? Number(avgRating[0].avgRating.toFixed(1)) : 0,
      topRecipe: topRecipeByRating[0] ? { id: topRecipeByRating[0]._id, name: topRecipeByRating[0].recipe[0]?.name || 'Unknown', rating: Number((topRecipeByRating[0].avgRating || 0).toFixed(1)), reviewCount: topRecipeByRating[0].count } : null,
    };
    return res.json({ success: true, message: 'Stats loaded successfully', data: stats });
  } catch (err) {
    console.error('❌ Error fetching stats:', err);
    return next(new AppError(err.message || 'Failed to load stats', 500));
  }
}

/**
 * GET /api/admin/recipes/:id 
 */
async function getRecipeDetail(req, res, next) {
  try {
    const recipe = await Recipe.findById(req.params.id).lean();
    if (!recipe) {
      return next(new AppError('Recipe not found', 404));
    }

    const [nutrition, reviewStats, dbIngredients, dbSteps] = await Promise.all([
      RecipeNutrition.findOne({ recipe_id: recipe._id }).lean(),
      RecipeReview.aggregate([{ $match: { recipe_id: recipe._id } }, { $group: { _id: null, count: { $sum: 1 }, avgRating: { $avg: '$rating' } } }]),
      RecipeIngredient.find({ recipe_id: recipe._id }).lean(),
      RecipeStep.find({ recipe_id: recipe._id }).sort({ step_number: 1 }).lean()
    ]);

    let enrichedIngredients = [];
    if (dbIngredients.length > 0) {
      const ingIds = dbIngredients.map(i => i.ingredient_id);
      const ingsData = await Ingredient.find({ _id: { $in: ingIds } }).lean();
      const ingMap = {};
      ingsData.forEach(d => { ingMap[d._id.toString()] = d; });

      enrichedIngredients = dbIngredients.map(item => ({
        ...item,
        name: ingMap[item.ingredient_id]?.name || "Nguyên liệu ẩn",
        unit: item.unit || ingMap[item.ingredient_id]?.unit || "g"
      }));
    }

    const stepsList = dbSteps.map(s => s.instruction);
    const revStats = reviewStats[0] || { count: 0, avgRating: 0 };

    const data = mapRecipeForAdmin(
      recipe,
      nutrition,
      revStats,
      enrichedIngredients.length,
      stepsList.length,
      enrichedIngredients,
      stepsList
    );

    return res.json({ success: true, message: 'Recipe loaded successfully', data });
  } catch (err) {
    console.error('❌ Error fetching recipe detail:', err);
    return next(new AppError(err.message || 'Failed to load recipe', 500));
  }
}

/**
 * UC-73: POST /api/admin/recipes
 */
async function addRecipe(req, res, next) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { name, description, image_url, cooking_time, base_servings, status, level_cooking, ingredients, steps } = req.body;

    if (!name) {
      await session.abortTransaction();
      session.endSession();
      return next(new AppError('Tên công thức là bắt buộc.', 400));
    }

    // 1. Upload ảnh lên Cloudinary nếu gửi dạng Base64
    let finalImageUrl = image_url || '';
    if (image_url && image_url.startsWith('data:image')) {
      finalImageUrl = await uploadBase64ToCloudinary(image_url);
    }

    // 2. Tạo Instance Recipe - Mặc định trạng thái 'published' nếu không truyền để hiển thị ngay ra UI
    const recipe = new Recipe({
      name,
      description, 
      image_url: finalImageUrl,
      cooking_time: Number(cooking_time) || 0,
      base_servings: Number(base_servings) || 1,
      status: status || 'published',
      level_cooking: level_cooking || 'medium',
    });

    await recipe.save({ session });

    let savedNutrition = { calories: 0, protein: 0, fat: 0, carbs: 0 };
    let enrichedIngredients = [];

    // 3. Xử lý Nguyên liệu & Dinh dưỡng
    if (ingredients && Array.isArray(ingredients) && ingredients.length > 0) {
      const processed = await processRecipeIngredients(recipe._id, ingredients);
      if (processed.recipeIngredientDocs.length > 0) {
        await RecipeIngredient.insertMany(processed.recipeIngredientDocs, { session });
        
        const [nutritionDoc] = await RecipeNutrition.create(
          [{ recipe_id: recipe._id, ...processed.nutrition }],
          { session }
        );
        savedNutrition = nutritionDoc.toObject();
        
        const ingIds = processed.recipeIngredientDocs.map(i => i.ingredient_id);
        const ingsData = await Ingredient.find({ _id: { $in: ingIds } }).lean();
        const ingMap = {};
        ingsData.forEach(d => { ingMap[d._id.toString()] = d; });
        
        enrichedIngredients = processed.recipeIngredientDocs.map(item => ({
          ...item,
          name: ingMap[item.ingredient_id]?.name || "Nguyên liệu ẩn",
          unit: item.unit || ingMap[item.ingredient_id]?.unit || "g"
        }));
      }
    } else {
      await RecipeNutrition.create(
        [{ recipe_id: recipe._id, calories: 0, protein: 0, fat: 0, carbs: 0 }],
        { session }
      );
    }

    // 4. Xử lý Các bước thực hiện
    let stepsList = [];
    if (steps && Array.isArray(steps) && steps.length > 0) {
      const recipeStepDocs = steps.map((stepContent, index) => ({
        recipe_id: recipe._id,
        step_number: index + 1,
        instruction: typeof stepContent === 'object' ? stepContent.instruction : stepContent,
      }));
      await RecipeStep.insertMany(recipeStepDocs, { session });
      stepsList = recipeStepDocs.map(s => s.instruction);
    }

    await session.commitTransaction();
    session.endSession();

    const responseData = mapRecipeForAdmin(recipe.toObject(), savedNutrition, null, enrichedIngredients.length, stepsList.length, enrichedIngredients, stepsList);

    return res.status(201).json({ success: true, message: 'Tạo công thức thành công!', data: responseData });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('❌ Error adding recipe:', err);
    return next(new AppError(err.message || 'Tạo công thức thất bại.', 500));
  }
}

/**
 * UC-74: PUT /api/admin/recipes/:id
 */
async function updateRecipe(req, res, next) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const recipeId = req.params.id;
    console.log(`\n=================== 🚀 UPDATE RECIPE START [ID: ${recipeId}] ===================`);
    console.log('📦 Request Body received:', JSON.stringify(req.body, null, 2));

    const { 
      name, 
      description, 
      cooking_time, 
      base_servings, 
      status, 
      level_cooking, 
      ingredients, 
      steps 
    } = req.body;

    // 1. Get image_url flexibly (snake_case or camelCase)
    const rawImageUrl = req.body.image_url !== undefined ? req.body.image_url : req.body.imageUrl;
    console.log('🖼️ RAW Image Field Check:', {
      'req.body.image_url': req.body.image_url,
      'req.body.imageUrl': req.body.imageUrl,
      'Resolved rawImageUrl': rawImageUrl
    });

    const recipe = await Recipe.findById(recipeId).session(session);
    if (!recipe) {
      console.log(`❌ Recipe NOT FOUND in DB for ID: ${recipeId}`);
      await session.abortTransaction();
      session.endSession();
      return next(new AppError('Recipe not found for update.', 404));
    }

    console.log('📌 Current Image URL in DB:', recipe.image_url);

    // 2. Update basic fields
    if (name) recipe.name = name;
    if (description !== undefined) recipe.description = description;

    // 3. Handle Image Upload & Base64 edge cases
    if (rawImageUrl !== undefined && rawImageUrl !== null) {
      const isBase64 = typeof rawImageUrl === 'string' && (
        rawImageUrl.toLowerCase().startsWith('data:image') || 
        /^[A-Za-z0-9+/=]+\s*$/.test(rawImageUrl.substring(0, 100))
      );

      console.log('🔍 Image Processing Check:', { isBase64 });

      if (isBase64) {
        console.log('🔄 Detected Base64 format -> Uploading to Cloudinary...');
        let formattedBase64 = rawImageUrl;
        if (!formattedBase64.toLowerCase().startsWith('data:image')) {
          formattedBase64 = `data:image/png;base64,${formattedBase64}`;
        }

        try {
          const uploadedUrl = await uploadBase64ToCloudinary(formattedBase64);
          console.log('✅ Cloudinary Upload Success -> New URL:', uploadedUrl);
          if (uploadedUrl) {
            recipe.image_url = uploadedUrl;
          } else {
            throw new Error('Cloudinary returned an empty URL.');
          }
        } catch (uploadErr) {
          console.error('❌ Cloudinary Upload Error:', uploadErr);
          await session.abortTransaction();
          session.endSession();
          return next(new AppError('Failed to upload image. Please try again!', 500));
        }
      } else {
        console.log('🔗 Assigning direct URL string to recipe.image_url:', rawImageUrl);
        recipe.image_url = rawImageUrl;
      }
    } else {
      console.log('⚠️ rawImageUrl is UNDEFINED or NULL. Image field will NOT be modified.');
    }

    console.log('💾 Image URL about to be saved in DB:', recipe.image_url);

    if (cooking_time !== undefined) recipe.cooking_time = Number(cooking_time);
    if (base_servings !== undefined) recipe.base_servings = Number(base_servings);
    if (status) recipe.status = status;
    if (level_cooking) recipe.level_cooking = level_cooking;

    // 4. Update steps array in main document
    let stepsList = [];
    if (steps && Array.isArray(steps)) {
      stepsList = steps.map(stepContent => typeof stepContent === 'object' ? stepContent.instruction : stepContent);
      recipe.steps = stepsList;
    }

    // Save main recipe document
    await recipe.save({ session });
    console.log('💾 Main Recipe Document saved successfully.');

    // 5. Handle Ingredients & Nutrition
    let savedNutrition = { calories: 0, protein: 0, fat: 0, carbs: 0 };
    let enrichedIngredients = [];

    if (ingredients && Array.isArray(ingredients)) {
      await RecipeIngredient.deleteMany({ recipe_id: recipeId }, { session });

      if (ingredients.length > 0) {
        const processed = await processRecipeIngredients(recipeId, ingredients);
        if (processed.recipeIngredientDocs.length > 0) {
          await RecipeIngredient.insertMany(processed.recipeIngredientDocs, { session });

          const nutDoc = await RecipeNutrition.findOneAndUpdate(
            { recipe_id: recipeId },
            { ...processed.nutrition },
            { upsert: true, returnDocument: 'after', session }
          );
          if (nutDoc) savedNutrition = nutDoc.toObject();

          const ingIds = processed.recipeIngredientDocs.map(i => i.ingredient_id);
          const ingsData = await Ingredient.find({ _id: { $in: ingIds } }).lean();
          const ingMap = {};
          ingsData.forEach(d => { ingMap[d._id.toString()] = d; });

          enrichedIngredients = processed.recipeIngredientDocs.map(item => ({
            ...item,
            name: ingMap[item.ingredient_id]?.name || "Unknown ingredient",
            unit: item.unit || ingMap[item.ingredient_id]?.unit || "g"
          }));
        }
      } else {
        await RecipeNutrition.findOneAndUpdate(
          { recipe_id: recipeId },
          { calories: 0, protein: 0, fat: 0, carbs: 0 },
          { upsert: true, returnDocument: 'after', session }
        );
      }
    }

    // 6. Save steps to RecipeStep auxiliary table
    if (steps && Array.isArray(steps)) {
      await RecipeStep.deleteMany({ recipe_id: recipeId }, { session });
      if (steps.length > 0) {
        const recipeStepDocs = steps.map((stepContent, index) => ({
          recipe_id: recipeId,
          step_number: index + 1,
          instruction: typeof stepContent === 'object' ? stepContent.instruction : stepContent
        }));
        await RecipeStep.insertMany(recipeStepDocs, { session });
      }
    }

    // Commit Transaction
    await session.commitTransaction();
    session.endSession();
    console.log('🎉 Transaction Committed Successfully!');

    // Map updated data for response
    const responseData = mapRecipeForAdmin(
      recipe.toObject(),
      savedNutrition,
      null,
      enrichedIngredients.length,
      stepsList.length,
      enrichedIngredients,
      stepsList
    );

    console.log('📤 Final Response image_url:', responseData.image_url || responseData.imageUrl);
    console.log(`=================== 🏁 UPDATE RECIPE END [ID: ${recipeId}] ===================\n`);

    return res.json({
      success: true,
      message: 'Recipe updated successfully!',
      data: responseData
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('❌ Error updating recipe:', err);
    return next(new AppError(err.message || 'Failed to update recipe.', 500));
  }
}

/**
 * UC-74: DELETE /api/admin/recipes/:id
 */
async function deleteRecipe(req, res, next) {
  try {
    const recipeId = req.params.id;

    const recipe = await Recipe.findById(recipeId);
    if (!recipe) {
      return next(new AppError('Không tìm thấy công thức.', 404));
    }

    recipe.status = 'archived';
    await recipe.save();
    return res.json({ success: true, message: 'Đã xóa mềm công thức thành công.' });
  } catch (err) {
    console.error('❌ Error deleting recipe:', err);
    return next(new AppError(err.message || 'Xóa công thức thất bại.', 500));
  }
}

/**
 * UC-75: GET /api/recipes (User search)
 */
async function searchAndFilterRecipes(req, res, next) {
  try {
    const { search, diet_trend, minTime, maxTime, minCalories, maxCalories, page = 1, limit = 10 } = req.query;
    const pageNum = Number(page) || 1, limitNum = Number(limit) || 10, skipNum = (pageNum - 1) * limitNum;

    const pipeline = [], matchStage = { status: 'published' };
    if (search) {
      const safeSearch = escapeRegex(String(search).trim());
      matchStage.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { description: { $regex: safeSearch, $options: 'i' } },
      ];
    }
    if (minTime || maxTime) {
      matchStage.cooking_time = {};
      if (minTime) matchStage.cooking_time.$gte = Number(minTime);
      if (maxTime) matchStage.cooking_time.$lte = Number(maxTime);
    }
    if (diet_trend) {
      matchStage.diet_trends = { $regex: escapeRegex(String(diet_trend).trim()), $options: 'i' };
    }

    pipeline.push({ $match: matchStage });
    pipeline.push({ $lookup: { from: 'recipenutritions', localField: '_id', foreignField: 'recipe_id', as: 'nutrition_info' } });
    pipeline.push({ $unwind: { path: '$nutrition_info', preserveNullAndEmptyArrays: true } });

    if (minCalories || maxCalories) {
      const calorieMatch = {};
      if (minCalories) calorieMatch['nutrition_info.calories'] = { $gte: Number(minCalories) };
      if (maxCalories) calorieMatch['nutrition_info.calories'] = { ...(calorieMatch['nutrition_info.calories'] || {}), $lte: Number(maxCalories) };
      pipeline.push({ $match: calorieMatch });
    }

    pipeline.push({ $facet: { metadata: [{ $count: 'total' }], data: [{ $sort: { createdAt: -1 } }, { $skip: skipNum }, { $limit: limitNum }] } });
    const result = await Recipe.aggregate(pipeline);

    const recipesList = result[0]?.data || [], totalRecords = result[0]?.metadata[0]?.total || 0;
    return res.json({ success: true, message: 'Tìm kiếm thành công!', pagination: { totalItems: totalRecords, totalPages: Math.ceil(totalRecords / limitNum), currentPage: pageNum, pageSize: limitNum }, data: recipesList });
  } catch (err) {
    console.error('❌ Error in Search/Filter Recipes:', err);
    return next(new AppError(err.message || 'Xảy ra lỗi trong quá trình tìm kiếm công thức.', 500));
  }
}

/**
 * UC-76: POST /api/admin/recipes/import-excel
 */
async function importRecipesExcel(req, res, next) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!req.file) {
      await session.abortTransaction();
      session.endSession();
      return next(new AppError('Vui lòng cung cấp tệp Excel (.xlsx hoặc .xls).', 400));
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(worksheet);

    if (rows.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return next(new AppError('Tệp Excel trống không có dữ liệu.', 400));
    }

    const uniqueIngredientIds = new Set();
    rows.forEach(row => {
      const rawIngs = row.Ingredients || row.ingredients;
      if (rawIngs) {
        String(rawIngs).split('|').forEach(item => {
          const parts = item.split(':');
          const ingIdClean = parts[0] ? parts[0].trim() : '';
          if (ingIdClean && mongoose.Types.ObjectId.isValid(ingIdClean)) {
            uniqueIngredientIds.add(ingIdClean);
          }
        });
      }
    });

    const ingredientList = await Ingredient.find({ _id: { $in: Array.from(uniqueIngredientIds) } }).lean();
    const ingredientMap = {};
    ingredientList.forEach(ing => { ingredientMap[ing._id.toString()] = ing; });

    const errorLog = [], recipesToInsert = [], ingredientsToInsert = [], stepsToInsert = [], nutritionsToInsert = [];
    const now = new Date(); 

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i], rowNumber = i + 2, name = row.Name || row.name;
      if (!name) { errorLog.push(`Dòng ${rowNumber}: Thiếu trường Name.`); continue; }

      const recipeId = new mongoose.Types.ObjectId();
      const rawIngsStr = row.Ingredients || row.ingredients || '';
      const rawIngredients = rawIngsStr ? String(rawIngsStr).split('|') : [];

      let totalCalories = 0, totalProtein = 0, totalFat = 0, totalCarbs = 0, hasIngredientError = false;
      const rowIngredientDocs = [];

      for (const item of rawIngredients) {
        const parts = item.split(':'), ingredientId = parts[0]?.trim();
        if (!ingredientId) continue;

        if (!mongoose.Types.ObjectId.isValid(ingredientId)) {
          errorLog.push(`Dòng ${rowNumber}: ID nguyên liệu '${ingredientId}' không đúng định dạng Mongoose ID.`);
          hasIngredientError = true;
          break;
        }

        const quantity = Number(parts[1]) || 0, unit = parts[2]?.trim() || '';
        const ingredientData = ingredientMap[ingredientId];
        if (!ingredientData) { errorLog.push(`Dòng ${rowNumber}: Không tìm thấy ID nguyên liệu '${ingredientId}' trong hệ thống.`); hasIngredientError = true; break; }

        totalCalories += (ingredientData.calories_per_unit || 0) * quantity;
        totalProtein += (ingredientData.protein || 0) * quantity;
        totalFat += (ingredientData.fat || 0) * quantity;
        totalCarbs += (ingredientData.carbs || 0) * quantity;

        rowIngredientDocs.push({ recipe_id: recipeId, ingredient_id: ingredientId, base_quantity: quantity, unit: unit || ingredientData.unit || 'g' });
      }

      if (hasIngredientError) continue;

      const rawStepsStr = row.Steps || row.steps || '';
      const rowStepDocs = (rawStepsStr ? String(rawStepsStr).split('|') : [])
        .map((instruction, index) => ({ recipe_id: recipeId, step_number: index + 1, instruction: String(instruction).trim() }))
        .filter(s => s.instruction);

      recipesToInsert.push({ 
        _id: recipeId, 
        name: String(name).trim(), 
        description: row.Description || row.description || '', 
        image_url: row.ImageUrl || row.image_url || '', 
        cooking_time: Number(row.CookingTime || row.cooking_time) || 0, 
        base_servings: Number(row.BaseServings || row.base_servings) || 1, 
        status: row.Status || row.status || 'published', 
        level_cooking: row.Level || row.level_cooking || 'medium',
        createdAt: now,
        updatedAt: now
      });
      
      ingredientsToInsert.push(...rowIngredientDocs);
      stepsToInsert.push(...rowStepDocs);
      nutritionsToInsert.push({ recipe_id: recipeId, calories: Math.round(totalCalories * 10) / 10, protein: Math.round(totalProtein * 10) / 10, fat: Math.round(totalFat * 10) / 10, carbs: Math.round(totalCarbs * 10) / 10 });
    }

    if (errorLog.length > 0) {
      await session.abortTransaction();
      session.endSession();
      return next(new AppError('Import thất bại do dữ liệu file Excel chứa lỗi logic.', 422, null, errorLog));
    }

    if (recipesToInsert.length > 0) { await Recipe.insertMany(recipesToInsert, { session }); }
    if (ingredientsToInsert.length > 0) { await RecipeIngredient.insertMany(ingredientsToInsert, { session }); }
    if (stepsToInsert.length > 0) { await RecipeStep.insertMany(stepsToInsert, { session }); }
    if (nutritionsToInsert.length > 0) { await RecipeNutrition.insertMany(nutritionsToInsert, { session }); }

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({ success: true, message: 'Import công thức từ Excel thành công!', data: { totalProcessed: rows.length, totalImported: recipesToInsert.length } });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('❌ Error Importing Excel Recipes:', err);
    return next(new AppError(err.message || 'Xảy ra lỗi hệ thống khi nhập dữ liệu tệp Excel.', 500));
  }
}

module.exports = {
  getRecipesList, getRecipesStats, getRecipeDetail, addRecipe, updateRecipe, deleteRecipe, searchAndFilterRecipes, importRecipesExcel
};