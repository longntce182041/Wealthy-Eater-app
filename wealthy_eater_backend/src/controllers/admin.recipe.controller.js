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

  if (query.status) {
    filter.status = { $regex: `^${escapeRegex(String(query.status).trim())}$`, $options: 'i' };
  }

  if (query.level) {
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

  const ingredientIds = ingredientsInput.map(i => i.ingredient_id).filter(Boolean);
  const ingredientDataList = await Ingredient.find({ _id: { $in: ingredientIds } }).lean();

  const ingredientMap = {};
  for (const data of ingredientDataList) {
    ingredientMap[data._id.toString()] = data;
  }

  for (const item of ingredientsInput) {
    const ingredientData = ingredientMap[item.ingredient_id];
    if (!ingredientData) continue;

    const quantity = Number(item.base_quantity) || 0;
    totalCalories += (ingredientData.calories_per_unit || 0) * quantity;
    totalProtein += (ingredientData.protein || 0) * quantity;
    totalFat += (ingredientData.fat || 0) * quantity;
    totalCarbs += (ingredientData.carbs || 0) * quantity;

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

    let sortObj = { createdAt: -1 };
    const sortBy = req.query.sortBy || 'newest';
    switch (sortBy) {
      case 'name_asc': sortObj = { name: 1 }; break;
      case 'name_desc': sortObj = { name: -1 }; break;
      case 'time_asc': sortObj = { cooking_time: 1 }; break;
      case 'time_desc': sortObj = { cooking_time: -1 }; break;
      case 'oldest': sortObj = { createdAt: 1 }; break;
      case 'newest': default: sortObj = { createdAt: -1 }; break;
    }

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const [recipes, total] = await Promise.all([
      Recipe.find(filter).sort(sortObj).skip(skip).limit(limit).lean(),
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
    const [totalRecipes, publishedRecipes, draftRecipes, totalReviews, avgRating, topRecipeByRating] = await Promise.all([
      Recipe.countDocuments({}),
      Recipe.countDocuments({ status: 'published' }),
      Recipe.countDocuments({ status: 'draft' }),
      RecipeReview.countDocuments({}),
      RecipeReview.aggregate([{ $group: { _id: null, avgRating: { $avg: '$rating' } } }]),
      RecipeReview.aggregate([{ $group: { _id: '$recipe_id', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }, { $sort: { avgRating: -1 } }, { $limit: 1 }, { $lookup: { from: 'recipes', localField: '_id', foreignField: '_id', as: 'recipe' } }]),
    ]);

    const stats = {
      totalRecipes, publishedRecipes, draftRecipes, totalReviews,
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
  try {
    const { name, description, image_url, cooking_time, base_servings, status, level_cooking, ingredients, steps } = req.body;

    if (!name) {
      return next(new AppError('Tên công thức là bắt buộc.', 400));
    }

    const recipe = new Recipe({
      name, description, image_url,
      cooking_time: Number(cooking_time) || 0,
      base_servings: Number(base_servings) || 1,
      status: status || 'draft',
      level_cooking: level_cooking || 'medium',
    });
    await recipe.save();

    let savedNutrition = { calories: 0, protein: 0, fat: 0, carbs: 0 };
    let enrichedIngredients = []; // Mảng chứa dữ liệu nguyên liệu đầy đủ để trả về Frontend

    if (ingredients && Array.isArray(ingredients) && ingredients.length > 0) {
      const processed = await processRecipeIngredients(recipe._id, ingredients);
      if (processed.recipeIngredientDocs.length > 0) {
        await RecipeIngredient.insertMany(processed.recipeIngredientDocs);
        const nutritionDoc = await RecipeNutrition.create({ recipe_id: recipe._id, ...processed.nutrition });
        savedNutrition = nutritionDoc.toObject();
        
        // Lấy thông tin tên nguyên liệu để trả về đồng bộ
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
      await RecipeNutrition.create({ recipe_id: recipe._id, calories: 0, protein: 0, fat: 0, carbs: 0 });
    }

    let stepsList = [];
    if (steps && Array.isArray(steps) && steps.length > 0) {
      const recipeStepDocs = steps.map((stepContent, index) => ({
        recipe_id: recipe._id,
        step_number: index + 1,
        instruction: typeof stepContent === 'object' ? stepContent.instruction : stepContent,
      }));
      await RecipeStep.insertMany(recipeStepDocs);
      stepsList = recipeStepDocs.map(s => s.instruction);
    }

    // 🌟 ĐỒNG BỘ ĐẦY ĐỦ: Truyền enrichedIngredients thay vì mảng rỗng []
    const responseData = mapRecipeForAdmin(
      recipe.toObject(), 
      savedNutrition, 
      null, 
      enrichedIngredients.length, 
      stepsList.length, 
      enrichedIngredients, 
      stepsList
    );

    return res.status(201).json({ success: true, message: 'Tạo công thức thành công!', data: responseData });
  } catch (err) {
    console.error('❌ Error adding recipe:', err);
    return next(new AppError(err.message || 'Tạo công thức thất bại.', 500));
  }
}

/**
 * UC-74: PUT /api/admin/recipes/:id
 */
async function updateRecipe(req, res, next) {
  try {
    const recipeId = req.params.id;
    const { name, description, image_url, cooking_time, base_servings, status, level_cooking, ingredients, steps } = req.body;

    const recipe = await Recipe.findById(recipeId);
    if (!recipe) {
      return next(new AppError('Không tìm thấy công thức để cập nhật.', 404));
    }

    if (name) recipe.name = name;
    if (description !== undefined) recipe.description = description;
    if (image_url !== undefined) recipe.image_url = image_url;
    if (cooking_time !== undefined) recipe.cooking_time = Number(cooking_time);
    if (base_servings !== undefined) recipe.base_servings = Number(base_servings);
    if (status) recipe.status = status;
    if (level_cooking) recipe.level_cooking = level_cooking;
    await recipe.save();

    let savedNutrition = { calories: 0, protein: 0, fat: 0, carbs: 0 };
    let enrichedIngredients = [];

    if (ingredients && Array.isArray(ingredients)) {
      await RecipeIngredient.deleteMany({ recipe_id: recipeId });
      if (ingredients.length > 0) {
        const processed = await processRecipeIngredients(recipeId, ingredients);
        if (processed.recipeIngredientDocs.length > 0) {
          await RecipeIngredient.insertMany(processed.recipeIngredientDocs);
          const nutDoc = await RecipeNutrition.findOneAndUpdate({ recipe_id: recipeId }, { ...processed.nutrition }, { upsert: true, new: true });
          if (nutDoc) savedNutrition = nutDoc.toObject();

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
        await RecipeNutrition.findOneAndUpdate({ recipe_id: recipeId }, { calories: 0, protein: 0, fat: 0, carbs: 0 }, { upsert: true });
      }
    }

    let stepsList = [];
    if (steps && Array.isArray(steps)) {
      await RecipeStep.deleteMany({ recipe_id: recipeId });
      if (steps.length > 0) {
        const recipeStepDocs = steps.map((stepContent, index) => ({ recipe_id: recipeId, step_number: index + 1, instruction: typeof stepContent === 'object' ? stepContent.instruction : stepContent }));
        await RecipeStep.insertMany(recipeStepDocs);
        stepsList = recipeStepDocs.map(s => s.instruction);
      }
    }

    // 🌟 ĐỒNG BỘ ĐẦY ĐỦ: Truyền enrichedIngredients thay vì mảng rỗng []
    const responseData = mapRecipeForAdmin(
      recipe.toObject(), 
      savedNutrition, 
      null, 
      enrichedIngredients.length, 
      stepsList.length, 
      enrichedIngredients, 
      stepsList
    );

    return res.json({ success: true, message: 'Cập nhật công thức thành công!', data: responseData });
  } catch (err) {
    console.error('❌ Error updating recipe:', err);
    return next(new AppError(err.message || 'Cập nhật công thức thất bại.', 500));
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

    // Xóa mềm: Chuyển trạng thái sang 'archived' thay vì xóa vật lý (hard delete)
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
    if (search) matchStage.$or = [{ name: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }];
    if (minTime || maxTime) {
      matchStage.cooking_time = {};
      if (minTime) matchStage.cooking_time.$gte = Number(minTime);
      if (maxTime) matchStage.cooking_time.$lte = Number(maxTime);
    }
    if (diet_trend) matchStage.diet_trends = { $regex: diet_trend, $options: 'i' };

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
  try {
    if (!req.file) {
      return next(new AppError('Vui lòng cung cấp tệp Excel (.xlsx hoặc .xls).', 400));
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(worksheet);

    if (rows.length === 0) {
      return next(new AppError('Tệp Excel trống không có dữ liệu.', 400));
    }

    // 2. Thu thập trước tất cả các ID nguyên liệu xuất hiện trong Excel để tìm kiếm hàng loạt (Tránh N+1)
    const uniqueIngredientIds = new Set();
    rows.forEach(row => {
      const rawIngs = row.Ingredients || row.ingredients;
      if (rawIngs) String(rawIngs).split('|').forEach(item => { const parts = item.split(':'); if (parts[0]) uniqueIngredientIds.add(parts[0].trim()); });
    });

    const ingredientList = await Ingredient.find({ _id: { $in: Array.from(uniqueIngredientIds) } }).lean();
    const ingredientMap = {};
    ingredientList.forEach(ing => { ingredientMap[ing._id.toString()] = ing; });

    const errorLog = [], recipesToInsert = [], ingredientsToInsert = [], stepsToInsert = [], nutritionsToInsert = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i], rowNumber = i + 2, name = row.Name || row.name;
      if (!name) { errorLog.push(`Dòng ${rowNumber}: Thiếu trường Name.`); continue; }

      // 🌟 SỬA LỖI TẠI ĐÂY: Tạo ObjectId thuần, không dùng .toString() để né lỗi ép kiểu string trong MongoDB
      const recipeId = new mongoose.Types.ObjectId();

      const rawIngsStr = row.Ingredients || row.ingredients || '';
      const rawIngredients = rawIngsStr ? String(rawIngsStr).split('|') : [];

      let totalCalories = 0, totalProtein = 0, totalFat = 0, totalCarbs = 0, hasIngredientError = false;
      const rowIngredientDocs = [];

      for (const item of rawIngredients) {
        const parts = item.split(':'), ingredientId = parts[0]?.trim();
        if (!ingredientId) continue;

        const quantity = Number(parts[1]) || 0, unit = parts[2]?.trim() || '';
        const ingredientData = ingredientMap[ingredientId];
        if (!ingredientData) { errorLog.push(`Dòng ${rowNumber}: Không tìm thấy ID '${ingredientId}'.`); hasIngredientError = true; break; }

        totalCalories += (ingredientData.calories_per_unit || 0) * quantity;
        totalProtein += (ingredientData.protein || 0) * quantity;
        totalFat += (ingredientData.fat || 0) * quantity;
        totalCarbs += (ingredientData.carbs || 0) * quantity;

        rowIngredientDocs.push({ recipe_id: recipeId, ingredient_id: ingredientId, base_quantity: quantity, unit: unit || ingredientData.unit || 'g' });
      }

      if (hasIngredientError) continue;

      const rawStepsStr = row.Steps || row.steps || '';
      const rowStepDocs = (rawStepsStr ? String(rawStepsStr).split('|') : []).map((instruction, index) => ({ recipe_id: recipeId, step_number: index + 1, instruction: instruction.trim() })).filter(s => s.instruction);

      recipesToInsert.push({ _id: recipeId, name: String(name).trim(), description: row.Description || row.description || '', image_url: row.ImageUrl || row.image_url || '', cooking_time: Number(row.CookingTime || row.cooking_time) || 0, base_servings: Number(row.BaseServings || row.base_servings) || 1, status: row.Status || row.status || 'published', level_cooking: row.Level || row.level_cooking || 'medium' });
      ingredientsToInsert.push(...rowIngredientDocs);
      stepsToInsert.push(...rowStepDocs);
      nutritionsToInsert.push({ recipe_id: recipeId, calories: Math.round(totalCalories * 10) / 10, protein: Math.round(totalProtein * 10) / 10, fat: Math.round(totalFat * 10) / 10, carbs: Math.round(totalCarbs * 10) / 10 });
    }

    // 4. Trả về toàn bộ log lỗi phát hiện được, không thực hiện lưu bất kỳ bản ghi nào (All-or-Nothing)
    if (errorLog.length > 0) {
      return next(new AppError('Import thất bại do dữ liệu file Excel chứa lỗi logic.', 422, null, errorLog));
    }

    // 5. Thực thi TRUE BULK INSERT đồng loạt vào 4 bảng
    if (recipesToInsert.length > 0) {
      await Recipe.insertMany(recipesToInsert);
    }
    if (ingredientsToInsert.length > 0) {
      await RecipeIngredient.insertMany(ingredientsToInsert);
    }
    if (stepsToInsert.length > 0) {
      await RecipeStep.insertMany(stepsToInsert);
    }
    if (nutritionsToInsert.length > 0) {
      await RecipeNutrition.insertMany(nutritionsToInsert);
    }

    return res.status(201).json({ success: true, message: 'Import thành công!', data: { totalProcessed: rows.length, totalImported: recipesToInsert.length } });
  } catch (err) {
    console.error('❌ Error Importing Excel Recipes:', err);
    return next(new AppError(err.message || 'Xảy ra lỗi hệ thống khi nhập dữ liệu tệp Excel.', 500));
  }
}

module.exports = {
  getRecipesList, getRecipesStats, getRecipeDetail, addRecipe, updateRecipe, deleteRecipe, searchAndFilterRecipes, importRecipesExcel
};