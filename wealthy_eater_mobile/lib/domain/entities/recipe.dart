// ---------------------------------------------------------------------------
// Ingredient
// ---------------------------------------------------------------------------

class RecipeIngredientEntity {
  final String id;
  final String ingredientId;
  final String name;
  final String imageUrl;
  final double quantity;
  final String unit;
  final double caloriesPerUnit;
  final double protein;
  final double fat;
  final double carbs;
  final String description;

  const RecipeIngredientEntity({
    required this.id,
    required this.ingredientId,
    required this.name,
    required this.imageUrl,
    required this.quantity,
    required this.unit,
    required this.caloriesPerUnit,
    required this.protein,
    required this.fat,
    required this.carbs,
    required this.description,
  });
}

// ---------------------------------------------------------------------------
// Step
// ---------------------------------------------------------------------------

class RecipeStepEntity {
  final String id;
  final int stepNumber;
  final String instruction;

  const RecipeStepEntity({
    required this.id,
    required this.stepNumber,
    required this.instruction,
  });
}

// ---------------------------------------------------------------------------
// Nutrition
// ---------------------------------------------------------------------------

class RecipeNutritionEntity {
  final double calories;
  final double protein;
  final double fat;
  final double carbs;

  const RecipeNutritionEntity({
    required this.calories,
    required this.protein,
    required this.fat,
    required this.carbs,
  });
}

// ---------------------------------------------------------------------------
// Review — typed entity for a user rating + comment
// ---------------------------------------------------------------------------

class RecipeReviewEntity {
  final String id;

  /// The user who wrote this review.
  final String userId;

  /// Display name of the reviewer (populated from User).
  final String userName;

  /// Star rating: 1 - 5.
  final int rating;

  /// Optional written comment.
  final String comment;

  final DateTime? createdAt;
  final DateTime? updatedAt;

  const RecipeReviewEntity({
    required this.id,
    required this.userId,
    required this.userName,
    required this.rating,
    required this.comment,
    this.createdAt,
    this.updatedAt,
  });
}

// ---------------------------------------------------------------------------
// Like (Favorite) — a record of a user liking a recipe
// ---------------------------------------------------------------------------

class RecipeLikeEntity {
  final String id;
  final String userId;
  final String recipeId;
  final DateTime? createdAt;

  const RecipeLikeEntity({
    required this.id,
    required this.userId,
    required this.recipeId,
    this.createdAt,
  });
}

// ---------------------------------------------------------------------------
// Recipe — main aggregate entity
// ---------------------------------------------------------------------------

class RecipeEntity {
  final String id;
  final String name;
  final String description;
  final String imageUrl;
  final int cookingTime;
  final int baseServings;
  final String status;
  final String difficulty;
  final String cookingStep;
  final RecipeNutritionEntity? nutrition;
  final List<RecipeIngredientEntity> ingredients;
  final List<RecipeStepEntity> steps;

  /// Typed list of reviews.
  final List<RecipeReviewEntity> reviews;

  final double? averageRating;
  final int reviewCount;

  /// True when the current user has liked / favorited this recipe (server-confirmed).
  final bool isLiked;

  /// Total number of likes this recipe has received.
  final int likeCount;

  const RecipeEntity({
    required this.id,
    required this.name,
    required this.description,
    required this.imageUrl,
    required this.cookingTime,
    required this.baseServings,
    required this.status,
    required this.difficulty,
    required this.cookingStep,
    required this.nutrition,
    required this.ingredients,
    required this.steps,
    required this.reviews,
    required this.averageRating,
    required this.reviewCount,
    this.isLiked = false,
    this.likeCount = 0,
  });

  RecipeEntity copyWith({
    String? id,
    String? name,
    String? description,
    String? imageUrl,
    int? cookingTime,
    int? baseServings,
    String? status,
    String? difficulty,
    String? cookingStep,
    RecipeNutritionEntity? nutrition,
    List<RecipeIngredientEntity>? ingredients,
    List<RecipeStepEntity>? steps,
    List<RecipeReviewEntity>? reviews,
    double? averageRating,
    int? reviewCount,
    bool? isLiked,
    int? likeCount,
  }) {
    return RecipeEntity(
      id: id ?? this.id,
      name: name ?? this.name,
      description: description ?? this.description,
      imageUrl: imageUrl ?? this.imageUrl,
      cookingTime: cookingTime ?? this.cookingTime,
      baseServings: baseServings ?? this.baseServings,
      status: status ?? this.status,
      difficulty: difficulty ?? this.difficulty,
      cookingStep: cookingStep ?? this.cookingStep,
      nutrition: nutrition ?? this.nutrition,
      ingredients: ingredients ?? this.ingredients,
      steps: steps ?? this.steps,
      reviews: reviews ?? this.reviews,
      averageRating: averageRating ?? this.averageRating,
      reviewCount: reviewCount ?? this.reviewCount,
      isLiked: isLiked ?? this.isLiked,
      likeCount: likeCount ?? this.likeCount,
    );
  }
}