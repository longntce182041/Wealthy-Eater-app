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
  final List<Map<String, dynamic>> reviews;
  final double? averageRating;
  final int reviewCount;
  final bool isFavorite;

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
    this.isFavorite = false,
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
    List<Map<String, dynamic>>? reviews,
    double? averageRating,
    int? reviewCount,
    bool? isFavorite,
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
      isFavorite: isFavorite ?? this.isFavorite,
    );
  }
}