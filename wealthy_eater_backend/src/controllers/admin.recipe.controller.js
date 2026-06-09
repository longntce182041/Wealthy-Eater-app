/**
 * Admin Recipe Controller - UC-71: View List Recipes
 * API para listar todas as receitas do sistema com paginação e filtros para o dashboard administrativo
 */

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

  // Filtro por busca (nome, descrição, nível)
  if (query.search) {
    const searchTerm = escapeRegex(String(query.search).trim());
    filter.$or = [
      { name: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } },
      { level_cooking: { $regex: searchTerm, $options: 'i' } },
    ];
  }

  // Filtro por status
  if (query.status) {
    filter.status = { $regex: `^${escapeRegex(String(query.status).trim())}$`, $options: 'i' };
  }

  // Filtro por nível de dificuldade
  if (query.level) {
    filter.level_cooking = { $regex: `^${escapeRegex(String(query.level).trim())}$`, $options: 'i' };
  }

  // Filtro por tempo de preparo (minutos)
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
 * Mapeia dados da receita para o formato retornado
 */
function mapRecipeForAdmin(recipe, nutrition, reviewStats, ingredientsCount, stepsCount) {
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
  };
}

/**
 * UC-71: GET /api/admin/recipes
 * Lista todas as receitas do sistema com paginação e filtros
 * 
 * Query Parameters:
 * - page: número da página (padrão: 1)
 * - limit: itens por página (padrão: 20, máximo: 100)
 * - search: termo de busca (nome, descrição, nível)
 * - status: filtrar por status (published, draft, archived, etc)
 * - level: filtrar por nível de dificuldade (easy, medium, hard)
 * - minTime: tempo mínimo de preparo em minutos
 * - maxTime: tempo máximo de preparo em minutos
 * - minCalories: calorias mínimas
 * - maxCalories: calorias máximas
 * - sortBy: ordenação (name_asc, name_desc, time_asc, time_desc, newest, oldest)
 */
async function getRecipesList(req, res) {
  try {
    const filter = buildAdminFilter(req.query || {});

    // Filtro por calorias via RecipeNutrition
    if (req.query.minCalories || req.query.maxCalories) {
      const nutritionFilter = {};
      
      if (req.query.minCalories) {
        nutritionFilter.calories = { $gte: Number(req.query.minCalories) };
      }
      if (req.query.maxCalories) {
        if (nutritionFilter.calories) {
          nutritionFilter.calories.$lte = Number(req.query.maxCalories);
        } else {
          nutritionFilter.calories = { $lte: Number(req.query.maxCalories) };
        }
      }

      const matchedNutritions = await RecipeNutrition.find(nutritionFilter)
        .select('recipe_id')
        .lean();
      const validRecipeIds = matchedNutritions.map(n => n.recipe_id);

      filter._id = { $in: validRecipeIds };
    }

    // Configurar ordenação
    let sortObj = { createdAt: -1 }; // Padrão: mais recentes primeiro
    const sortBy = req.query.sortBy || 'newest';

    switch (sortBy) {
      case 'name_asc':
        sortObj = { name: 1 };
        break;
      case 'name_desc':
        sortObj = { name: -1 };
        break;
      case 'time_asc':
        sortObj = { cooking_time: 1 };
        break;
      case 'time_desc':
        sortObj = { cooking_time: -1 };
        break;
      case 'oldest':
        sortObj = { createdAt: 1 };
        break;
      case 'newest':
      default:
        sortObj = { createdAt: -1 };
        break;
    }

    // Paginação
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const skip = (page - 1) * limit;

    // Buscar receitas com paginação
    const [recipes, total] = await Promise.all([
      Recipe.find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean(),
      Recipe.countDocuments(filter),
    ]);

    if (recipes.length === 0) {
      return res.json({
        success: true,
        message: 'No recipes found',
        data: [],
        meta: {
          page,
          limit,
          total,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      });
    }

    const recipeIds = recipes.map(r => r._id);

    // Buscar dados relacionados em paralelo
    const [nutritions, reviewStats, ingredientCounts, stepCounts] = await Promise.all([
      RecipeNutrition.find({ recipe_id: { $in: recipeIds } }).lean(),
      RecipeReview.aggregate([
        { $match: { recipe_id: { $in: recipeIds } } },
        {
          $group: {
            _id: '$recipe_id',
            count: { $sum: 1 },
            avgRating: { $avg: '$rating' },
          },
        },
      ]),
      RecipeIngredient.aggregate([
        { $match: { recipe_id: { $in: recipeIds } } },
        { $group: { _id: '$recipe_id', count: { $sum: 1 } } },
      ]),
      RecipeStep.aggregate([
        { $match: { recipe_id: { $in: recipeIds } } },
        { $group: { _id: '$recipe_id', count: { $sum: 1 } } },
      ]),
    ]);

    // Mapear dados relacionados por ID
    const nutritionMap = {};
    nutritions.forEach(n => {
      nutritionMap[n.recipe_id] = n;
    });

    const reviewMap = {};
    reviewStats.forEach(r => {
      reviewMap[r._id] = r;
    });

    const ingredientMap = {};
    ingredientCounts.forEach(i => {
      ingredientMap[i._id] = i.count;
    });

    const stepMap = {};
    stepCounts.forEach(s => {
      stepMap[s._id] = s.count;
    });

    // Mapear receitas com dados relacionados
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
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return res.json({
      success: true,
      message: 'Recipes loaded successfully',
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
    });
  } catch (err) {
    console.error('❌ Error fetching recipes:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to load recipes',
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }
}

/**
 * UC-71: GET /api/admin/recipes/stats
 * Obtém estatísticas gerais sobre receitas
 */
async function getRecipesStats(req, res) {
  try {
    const [
      totalRecipes,
      publishedRecipes,
      draftRecipes,
      totalReviews,
      avgRating,
      topRecipeByRating,
    ] = await Promise.all([
      Recipe.countDocuments({}),
      Recipe.countDocuments({ status: 'published' }),
      Recipe.countDocuments({ status: 'draft' }),
      RecipeReview.countDocuments({}),
      RecipeReview.aggregate([
        { $group: { _id: null, avgRating: { $avg: '$rating' } } },
      ]),
      RecipeReview.aggregate([
        {
          $group: {
            _id: '$recipe_id',
            avgRating: { $avg: '$rating' },
            count: { $sum: 1 },
          },
        },
        { $sort: { avgRating: -1 } },
        { $limit: 1 },
        {
          $lookup: {
            from: 'recipes',
            localField: '_id',
            foreignField: '_id',
            as: 'recipe',
          },
        },
      ]),
    ]);

    const stats = {
      totalRecipes,
      publishedRecipes,
      draftRecipes,
      totalReviews,
      averageRating: avgRating[0]?.avgRating ? Number(avgRating[0].avgRating.toFixed(1)) : 0,
      topRecipe: topRecipeByRating[0]
        ? {
            id: topRecipeByRating[0]._id,
            name: topRecipeByRating[0].recipe[0]?.name || 'Unknown',
            rating: Number((topRecipeByRating[0].avgRating || 0).toFixed(1)),
            reviewCount: topRecipeByRating[0].count,
          }
        : null,
    };

    return res.json({
      success: true,
      message: 'Stats loaded successfully',
      data: stats,
    });
  } catch (err) {
    console.error('❌ Error fetching stats:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to load stats',
    });
  }
}

/**
 * GET /api/admin/recipes/:id
 * Obtém detalhes completos de uma receita específica
 */
async function getRecipeDetail(req, res) {
  try {
    const recipe = await Recipe.findById(req.params.id).lean();

    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: 'Recipe not found',
      });
    }

    const [nutrition, reviewStats] = await Promise.all([
      RecipeNutrition.findOne({ recipe_id: recipe._id }).lean(),
      RecipeReview.aggregate([
        { $match: { recipe_id: recipe._id } },
        { $group: { _id: null, count: { $sum: 1 }, avgRating: { $avg: '$rating' } } },
      ]),
    ]);

    const revStats = reviewStats[0] || { count: 0, avgRating: 0 };

    const data = mapRecipeForAdmin(
      recipe,
      nutrition,
      revStats,
      // Estas contagens não são necessárias aqui, pode passar 0
      0,
      0
    );

    return res.json({
      success: true,
      message: 'Recipe loaded successfully',
      data,
    });
  } catch (err) {
    console.error('❌ Error fetching recipe detail:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to load recipe',
    });
  }
}
/**
 * UC-73: POST /api/admin/recipes
 * Tạo công thức nấu ăn mới và tự động tính toán tổng dinh dưỡng
 */
async function addRecipe(req, res) {
  try {
    const {
      name, description, image_url, cooking_time, base_servings, status, level_cooking,
      ingredients, steps
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Tên công thức là bắt buộc.' });
    }

    // 1. Tạo mới công thức
    const recipe = new Recipe({
      name,
      description,
      image_url,
      cooking_time: Number(cooking_time) || 0,
      base_servings: Number(base_servings) || 1,
      status: status || 'draft',
      level_cooking: level_cooking || 'medium',
    });

    await recipe.save();

    // 2. Thêm nguyên liệu & tính tổng dinh dưỡng
    if (ingredients && Array.isArray(ingredients) && ingredients.length > 0) {
      let totalCalories = 0, totalProtein = 0, totalFat = 0, totalCarbs = 0;
      const recipeIngredientDocs = [];

      for (const item of ingredients) {
        const ingredientData = await Ingredient.findById(item.ingredient_id).lean();
        if (!ingredientData) {
          continue; 
        }

        const quantity = Number(item.base_quantity) || 0;
        totalCalories += (ingredientData.calories_per_unit || 0) * quantity;
        totalProtein += (ingredientData.protein || 0) * quantity;
        totalFat += (ingredientData.fat || 0) * quantity;
        totalCarbs += (ingredientData.carbs || 0) * quantity;

        recipeIngredientDocs.push({
          recipe_id: recipe._id,
          ingredient_id: item.ingredient_id,
          base_quantity: quantity,
          unit: item.unit || ingredientData.unit || 'g',
        });
      }

      if (recipeIngredientDocs.length > 0) {
        await RecipeIngredient.insertMany(recipeIngredientDocs);
      }

      // Lưu tổng dinh dưỡng
      await RecipeNutrition.create({
        recipe_id: recipe._id,
        calories: Math.round(totalCalories * 10) / 10,
        protein: Math.round(totalProtein * 10) / 10,
        fat: Math.round(totalFat * 10) / 10,
        carbs: Math.round(totalCarbs * 10) / 10,
      });
    }

    // 3. Thêm các bước nấu
    if (steps && Array.isArray(steps) && steps.length > 0) {
      const recipeStepDocs = steps.map((stepContent, index) => ({
        recipe_id: recipe._id,
        step_number: typeof stepContent === 'object' ? stepContent.step_number : index + 1,
        instruction: typeof stepContent === 'object' ? stepContent.instruction : stepContent,
      }));

      await RecipeStep.insertMany(recipeStepDocs);
    }

    return res.status(201).json({
      success: true,
      message: 'Tạo công thức thành công!',
      data: recipe,
    });
  } catch (err) {
    console.error('❌ Error adding recipe:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Tạo công thức thất bại.',
    });
  }
}

/**
 * UC-74: PUT /api/admin/recipes/:id
 * Cập nhật công thức (Bao gồm thông tin cơ bản, cập nhật nguyên liệu, bước nấu và tự tính lại dinh dưỡng)
 */
async function updateRecipe(req, res) {
  try {
    const recipeId = req.params.id;
    const {
      name, description, image_url, cooking_time, base_servings, status, level_cooking,
      ingredients, steps
    } = req.body;

    // 1. Kiểm tra xem công thức có tồn tại không
    const recipe = await Recipe.findById(recipeId);
    if (!recipe) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy công thức để cập nhật.' });
    }

    // 2. Cập nhật thông tin cơ bản của Recipe
    if (name) recipe.name = name;
    if (description !== undefined) recipe.description = description;
    if (image_url !== undefined) recipe.image_url = image_url;
    if (cooking_time !== undefined) recipe.cooking_time = Number(cooking_time);
    if (base_servings !== undefined) recipe.base_servings = Number(base_servings);
    if (status) recipe.status = status;
    if (level_cooking) recipe.level_cooking = level_cooking;

    await recipe.save();

    // 3. Cập nhật Nguyên liệu & Tính lại Dinh dưỡng (Chỉ thực thi nếu client có gửi mảng ingredients)
    if (ingredients && Array.isArray(ingredients)) {
      let totalCalories = 0, totalProtein = 0, totalFat = 0, totalCarbs = 0;
      const recipeIngredientDocs = [];

      for (const item of ingredients) {
        const ingredientData = await Ingredient.findById(item.ingredient_id).lean();
        if (!ingredientData) {
          return res.status(404).json({
            success: false,
            message: `Không tìm thấy nguyên liệu có ID: ${item.ingredient_id}`,
          });
        }

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

      // Chiến lược thay thế: Xóa nguyên liệu cũ -> Thêm nguyên liệu mới
      await RecipeIngredient.deleteMany({ recipe_id: recipeId });
      if (recipeIngredientDocs.length > 0) {
        await RecipeIngredient.insertMany(recipeIngredientDocs);
      }

      // Cập nhật lại chỉ số dinh dưỡng (dùng findOneAndUpdate để nếu chưa có thì upsert tạo mới)
      await RecipeNutrition.findOneAndUpdate(
        { recipe_id: recipeId },
        {
          calories: Math.round(totalCalories * 10) / 10,
          protein: Math.round(totalProtein * 10) / 10,
          fat: Math.round(totalFat * 10) / 10,
          carbs: Math.round(totalCarbs * 10) / 10,
        },
        { upsert: true, new: true }
      );
    }

    // 4. Cập nhật các bước nấu ăn (Chỉ thực thi nếu client gửi mảng steps)
    if (steps && Array.isArray(steps)) {
      const recipeStepDocs = steps.map((stepContent, index) => ({
        recipe_id: recipeId,
        step_number: typeof stepContent === 'object' ? stepContent.step_number : index + 1,
        instruction: typeof stepContent === 'object' ? stepContent.instruction : stepContent,
      }));

      // Chiến lược thay thế: Xóa bước cũ -> Thêm bước mới
      await RecipeStep.deleteMany({ recipe_id: recipeId });
      if (recipeStepDocs.length > 0) {
        await RecipeStep.insertMany(recipeStepDocs);
      }
    }

    return res.json({
      success: true,
      message: 'Cập nhật công thức thành công!',
      data: recipe,
    });
  } catch (err) {
    console.error('❌ Error updating recipe:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Cập nhật công thức thất bại.',
    });
  }
}

/**
 * UC-74: DELETE /api/admin/recipes/:id
 * Xóa mềm công thức (Đổi trạng thái thành 'archived' để ẩn đi)
 */
async function deleteRecipe(req, res) {
  try {
    const recipeId = req.params.id;

    const recipe = await Recipe.findById(recipeId);
    if (!recipe) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy công thức.' });
    }

    // Xóa mềm: Chuyển trạng thái sang 'archived' thay vì xóa vật lý (hard delete)
    recipe.status = 'archived';
    await recipe.save();

    return res.json({
      success: true,
      message: 'Đã xóa mềm công thức thành công (đã ẩn khỏi danh sách hiển thị).',
    });
  } catch (err) {
    console.error('❌ Error deleting recipe:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Xóa công thức thất bại.',
    });
  }
}

module.exports = {
  getRecipesList,
  getRecipesStats,
  getRecipeDetail,
  addRecipe,
  updateRecipe,
  deleteRecipe
};
