const Recipe = require('../models/Recipe');
const RecipeIngredient = require('../models/RecipeIngredient');
const RecipeStep = require('../models/RecipeStep');
const RecipeNutrition = require('../models/RecipeNutrition');
const RecipeReview = require('../models/RecipeReview');
const Ingredient = require('../models/Ingredient');

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildFilter(query) {
  const filter = {};
  const search = String(query.search || '').trim();

  if (search) {
    filter.$or = [
      { name: { $regex: escapeRegex(search), $options: 'i' } },
      { description: { $regex: escapeRegex(search), $options: 'i' } },
      { level_cooking: { $regex: escapeRegex(search), $options: 'i' } },
      { cooking_step: { $regex: escapeRegex(search), $options: 'i' } },
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
    if (query.minTime) filter.cooking_time.$gte = Number(query.minTime);
    if (query.maxTime) filter.cooking_time.$lte = Number(query.maxTime);
  }

  return filter;
}

function mapIngredient(ingredient, relation) {
  const source = ingredient || {};
  return {
    id: relation?._id || '',                                          // ID của RecipeIngredient (join record)
    ingredientId: source._id || relation?.ingredient_id || '',        // ID của Ingredient gốc
    name: source.name || 'Ingredient',
    imageUrl: source.image_url || '',
    quantity: relation?.base_quantity ?? 0,
    unit: relation?.unit || source.unit || '',
    caloriesPerUnit: source.calories_per_unit ?? 0,
    protein: source.protein ?? 0,
    fat: source.fat ?? 0,
    carbs: source.carbs ?? 0,
    description: source.description || '',
  };
}

function mapRecipe(recipe, extras = {}) {
  return {
    id: recipe._id,
    name: recipe.name,
    description: recipe.description || '',
    imageUrl: recipe.image_url || '',
    cookingTime: recipe.cooking_time ?? 0,
    baseServings: recipe.base_servings ?? 1,
    status: recipe.status || 'unknown',
    // Mobile reads 'level_cooking' OR 'difficulty' — use snake_case to match both
    level_cooking: recipe.level_cooking || 'unknown',
    cookingStep: recipe.cooking_step || '',
    averageRating: extras.reviewCount ? extras.averageRating ?? 0 : null,
    reviewCount: extras.reviewCount ?? 0,
    ingredientsCount: extras.ingredientsCount ?? 0,
    stepsCount: extras.stepsCount ?? 0,
    nutrition: extras.nutrition || null,
    ingredients: extras.ingredients || [],
    steps: extras.steps || [],
    reviews: extras.reviews || [],
  };
}

async function list(req, res) {
  try {
    const filter = buildFilter(req.query || {});
    
    // 1. Handle Nutrition Filtering via RecipeNutrition
    if (req.query.minCalories || req.query.maxCalories || req.query.minProtein || req.query.maxProtein) {
      const nutritionFilter = {};
      if (req.query.minCalories || req.query.maxCalories) {
        nutritionFilter.calories = {};
        if (req.query.minCalories) nutritionFilter.calories.$gte = Number(req.query.minCalories);
        if (req.query.maxCalories) nutritionFilter.calories.$lte = Number(req.query.maxCalories);
      }
      if (req.query.minProtein || req.query.maxProtein) {
        nutritionFilter.protein = {};
        if (req.query.minProtein) nutritionFilter.protein.$gte = Number(req.query.minProtein);
        if (req.query.maxProtein) nutritionFilter.protein.$lte = Number(req.query.maxProtein);
      }
      
      const matchedNutritions = await RecipeNutrition.find(nutritionFilter).select('recipe_id').lean();
      const validRecipeIds = matchedNutritions.map(n => n.recipe_id);
      
      if (filter._id) {
        // If there's already an _id filter, we'd need to intersect, but usually there isn't in list()
        filter._id = { $in: validRecipeIds };
      } else {
        filter._id = { $in: validRecipeIds };
      }
    }

    // 2. Handle Sorting
    let sortObj = { name: 1 }; // Default
    const sortBy = req.query.sortBy || 'name_asc';
    switch (sortBy) {
      case 'newest':
        sortObj = { _id: -1 };
        break;
      case 'time_asc':
        sortObj = { cooking_time: 1 };
        break;
      case 'time_desc':
        sortObj = { cooking_time: -1 };
        break;
      case 'name_desc':
        sortObj = { name: -1 };
        break;
      case 'name_asc':
      default:
        sortObj = { name: 1 };
        break;
    }

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const [recipes, total] = await Promise.all([
      Recipe.find(filter).sort(sortObj).skip(skip).limit(limit).lean(),
      Recipe.countDocuments(filter),
    ]);

    const recipeIds = recipes.map(r => r._id);

    // 1. Fetch all nutrition
    const nutritions = await RecipeNutrition.find({ recipe_id: { $in: recipeIds } }).lean();
    const nutritionMap = {};
    for (const n of nutritions) nutritionMap[n.recipe_id] = n;

    // 2. Fetch all review stats using Aggregation
    const reviewStats = await RecipeReview.aggregate([
      { $match: { recipe_id: { $in: recipeIds } } },
      { $group: { _id: '$recipe_id', count: { $sum: 1 }, avgRating: { $avg: '$rating' } } }
    ]);
    const reviewMap = {};
    for (const r of reviewStats) reviewMap[r._id] = r;

    // 3. Fetch all ingredient counts
    const ingredientCounts = await RecipeIngredient.aggregate([
      { $match: { recipe_id: { $in: recipeIds } } },
      { $group: { _id: '$recipe_id', count: { $sum: 1 } } }
    ]);
    const ingredientCountMap = {};
    for (const i of ingredientCounts) ingredientCountMap[i._id] = i.count;

    // 4. Fetch all step counts
    const stepCounts = await RecipeStep.aggregate([
      { $match: { recipe_id: { $in: recipeIds } } },
      { $group: { _id: '$recipe_id', count: { $sum: 1 } } }
    ]);
    const stepCountMap = {};
    for (const s of stepCounts) stepCountMap[s._id] = s.count;

    const data = recipes.map(recipe => {
      const nutrition = nutritionMap[recipe._id];
      const revStats = reviewMap[recipe._id] || { count: 0, avgRating: 0 };
      const ingredientsCount = ingredientCountMap[recipe._id] || 0;
      const stepsCount = stepCountMap[recipe._id] || 0;

      return mapRecipe(recipe, {
        nutrition: nutrition ? {
          calories: nutrition.calories,
          protein: nutrition.protein,
          fat: nutrition.fat,
          carbs: nutrition.carbs,
        } : null,
        averageRating: revStats.count ? Number(revStats.avgRating.toFixed(1)) : 0,
        reviewCount: revStats.count,
        ingredientsCount,
        stepsCount,
      });
    });

    return res.json({
      success: true,
      message: 'Recipes loaded successfully',
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to load recipes',
    });
  }
}

async function detail(req, res) {
  try {
    const recipe = await Recipe.findById(req.params.id).lean();

    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: 'Recipe not found',
      });
    }

    const [nutrition, ingredientsRelations, steps, reviewStats, recentReviews] = await Promise.all([
      RecipeNutrition.findOne({ recipe_id: recipe._id }).lean(),
      RecipeIngredient.find({ recipe_id: recipe._id }).populate('ingredient_id').lean(),
      RecipeStep.find({ recipe_id: recipe._id }).sort({ step_number: 1 }).lean(),
      RecipeReview.aggregate([
        { $match: { recipe_id: recipe._id } },
        { $group: { _id: null, count: { $sum: 1 }, avgRating: { $avg: '$rating' } } }
      ]),
      RecipeReview.find({ recipe_id: recipe._id }).sort({ createdAt: -1 }).limit(10).lean(),
    ]);

    const ingredients = ingredientsRelations.map((relation) => mapIngredient(relation.ingredient_id, relation));
    const revStats = reviewStats[0] || { count: 0, avgRating: 0 };

    return res.json({
      success: true,
      message: 'Recipe loaded successfully',
      data: mapRecipe(recipe, {
        nutrition: nutrition ? {
          calories: nutrition.calories,
          protein: nutrition.protein,
          fat: nutrition.fat,
          carbs: nutrition.carbs,
        } : null,
        averageRating: revStats.count ? Number(revStats.avgRating.toFixed(1)) : 0,
        reviewCount: revStats.count,
        ingredientsCount: ingredients.length,
        stepsCount: steps.length,
        ingredients,
        steps: steps.map((step) => ({
          id: step._id,
          stepNumber: step.step_number,
          instruction: step.instruction,
        })),
        reviews: recentReviews.map((review) => ({
          id: review._id,
          rating: review.rating,
          comment: review.comment || '',
          userId: review.user_id,
        })),
      }),
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to load recipe',
    });
  }
}

module.exports = {
  list,
  detail,
};