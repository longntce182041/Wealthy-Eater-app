const Recipe = require('../models/Recipe');
const RecipeIngredient = require('../models/RecipeIngredient');
const RecipeStep = require('../models/RecipeStep');
const RecipeNutrition = require('../models/RecipeNutrition');
const RecipeReview = require('../models/RecipeReview');
const Ingredient = require('../models/Ingredient');
const AppError = require('../utils/AppError');
const { escapeRegex } = require('../utils/string.util');

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
    id: relation?._id || '',                                         
    ingredientId: source._id || relation?.ingredient_id || '',        
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

class UserRecipeService {
  async list(query) {
    const filter = buildFilter(query || {});
    
    if (query.minCalories || query.maxCalories || query.minProtein || query.maxProtein) {
      const nutritionFilter = {};
      if (query.minCalories || query.maxCalories) {
        nutritionFilter.calories = {};
        if (query.minCalories) nutritionFilter.calories.$gte = Number(query.minCalories);
        if (query.maxCalories) nutritionFilter.calories.$lte = Number(query.maxCalories);
      }
      if (query.minProtein || query.maxProtein) {
        nutritionFilter.protein = {};
        if (query.minProtein) nutritionFilter.protein.$gte = Number(query.minProtein);
        if (query.maxProtein) nutritionFilter.protein.$lte = Number(query.maxProtein);
      }
      
      const validRecipeIds = await RecipeNutrition.distinct('recipe_id', nutritionFilter);
      filter._id = { $in: validRecipeIds };
    }

    let sortObj = { name: 1 };
    const sortBy = query.sortBy || 'name_asc';
    switch (sortBy) {
      case 'newest': sortObj = { _id: -1 }; break;
      case 'time_asc': sortObj = { cooking_time: 1 }; break;
      case 'time_desc': sortObj = { cooking_time: -1 }; break;
      case 'name_desc': sortObj = { name: -1 }; break;
      case 'name_asc': default: sortObj = { name: 1 }; break;
    }

    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const [recipes, total] = await Promise.all([
      Recipe.find(filter).sort(sortObj).skip(skip).limit(limit).lean(),
      Recipe.countDocuments(filter),
    ]);

    const recipeIds = recipes.map(r => r._id);

    const [nutritions, reviewStats, ingredientCounts, stepCounts] = await Promise.all([
      RecipeNutrition.find({ recipe_id: { $in: recipeIds } }).lean(),
      RecipeReview.aggregate([
        { $match: { recipe_id: { $in: recipeIds } } },
        { $group: { _id: '$recipe_id', count: { $sum: 1 }, avgRating: { $avg: '$rating' } } }
      ]),
      RecipeIngredient.aggregate([
        { $match: { recipe_id: { $in: recipeIds } } },
        { $group: { _id: '$recipe_id', count: { $sum: 1 } } }
      ]),
      RecipeStep.aggregate([
        { $match: { recipe_id: { $in: recipeIds } } },
        { $group: { _id: '$recipe_id', count: { $sum: 1 } } }
      ])
    ]);

    const nutritionMap = {};
    for (const n of nutritions) nutritionMap[n.recipe_id] = n;

    const reviewMap = {};
    for (const r of reviewStats) reviewMap[r._id] = r;

    const ingredientCountMap = {};
    for (const i of ingredientCounts) ingredientCountMap[i._id] = i.count;

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

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async detail(recipeId) {
    const recipe = await Recipe.findById(recipeId).lean();

    if (!recipe) {
      throw new AppError('Recipe not found', 404);
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

    return mapRecipe(recipe, {
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
    });
  }
}

module.exports = new UserRecipeService();
