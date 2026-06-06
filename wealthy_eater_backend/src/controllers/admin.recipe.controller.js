/**
 * Admin Recipe Controller - UC-71: View List Recipes
 * API para listar todas as receitas do sistema com paginação e filtros para o dashboard administrativo
 */

const Recipe = require('../models/Recipe');
const RecipeNutrition = require('../models/RecipeNutrition');
const RecipeIngredient = require('../models/RecipeIngredient');
const RecipeStep = require('../models/RecipeStep');
const RecipeReview = require('../models/RecipeReview');

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

module.exports = {
  getRecipesList,
  getRecipesStats,
  getRecipeDetail,
};
