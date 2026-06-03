import '../../domain/entities/recipe.dart';

double _toDouble(dynamic value, [double fallback = 0]) {
  if (value is num) return value.toDouble();
  if (value is String) return double.tryParse(value) ?? fallback;
  return fallback;
}

int _toInt(dynamic value, [int fallback = 0]) {
  if (value is num) return value.toInt();
  if (value is String) return int.tryParse(value) ?? fallback;
  return fallback;
}

String _readString(Map<String, dynamic> json, List<String> keys, [String fallback = '']) {
  for (final key in keys) {
    final value = json[key];
    if (value is String && value.isNotEmpty) return value;
  }
  return fallback;
}

class RecipeNutritionModel extends RecipeNutritionEntity {
  const RecipeNutritionModel({
    required super.calories,
    required super.protein,
    required super.fat,
    required super.carbs,
  });

  factory RecipeNutritionModel.fromJson(Map<String, dynamic> json) {
    return RecipeNutritionModel(
      calories: _toDouble(json['calories']),
      protein: _toDouble(json['protein']),
      fat: _toDouble(json['fat']),
      carbs: _toDouble(json['carbs']),
    );
  }
}

class RecipeIngredientModel extends RecipeIngredientEntity {
  const RecipeIngredientModel({
    required super.id,
    required super.ingredientId,
    required super.name,
    required super.imageUrl,
    required super.quantity,
    required super.unit,
    required super.caloriesPerUnit,
    required super.protein,
    required super.fat,
    required super.carbs,
    required super.description,
  });

  factory RecipeIngredientModel.fromJson(Map<String, dynamic> json) {
    return RecipeIngredientModel(
      id: _readString(json, ['id', '_id']),
      ingredientId: _readString(json, ['ingredientId', 'ingredient_id']),
      name: _readString(json, ['name', 'ingredientName']),
      imageUrl: _readString(json, ['imageUrl', 'image_url']),
      quantity: _toDouble(json['quantity'] ?? json['base_quantity']),
      unit: _readString(json, ['unit'], 'serving'),
      caloriesPerUnit: _toDouble(json['caloriesPerUnit'] ?? json['calories_per_unit']),
      protein: _toDouble(json['protein']),
      fat: _toDouble(json['fat']),
      carbs: _toDouble(json['carbs']),
      description: _readString(json, ['description']),
    );
  }
}

class RecipeStepModel extends RecipeStepEntity {
  const RecipeStepModel({
    required super.id,
    required super.stepNumber,
    required super.instruction,
  });

  factory RecipeStepModel.fromJson(Map<String, dynamic> json) {
    return RecipeStepModel(
      id: _readString(json, ['id', '_id']),
      stepNumber: _toInt(json['stepNumber'] ?? json['step_number']),
      instruction: _readString(json, ['instruction']),
    );
  }
}

class RecipeModel extends RecipeEntity {
  const RecipeModel({
    required super.id,
    required super.name,
    required super.description,
    required super.imageUrl,
    required super.cookingTime,
    required super.baseServings,
    required super.status,
    required super.difficulty,
    required super.cookingStep,
    required super.nutrition,
    required super.ingredients,
    required super.steps,
    required super.reviews,
    required super.averageRating,
    required super.reviewCount,
    super.isFavorite = false,
  });

  factory RecipeModel.fromJson(Map<String, dynamic> json) {
    final nutritionJson = json['nutrition'];
    final ingredientsJson = json['ingredients'];
    final stepsJson = json['steps'];
    final reviewsJson = json['reviews'];

    return RecipeModel(
      id: _readString(json, ['id', '_id']),
      name: _readString(json, ['name']),
      description: _readString(json, ['description']),
      imageUrl: _readString(json, ['imageUrl', 'image_url']),
      cookingTime: _toInt(json['cookingTime'] ?? json['cooking_time']),
      baseServings: _toInt(json['baseServings'] ?? json['base_servings'], 1),
      status: _readString(json, ['status'], 'Published'),
      difficulty: _readString(json, ['difficulty', 'level_cooking'], 'Medium'),
      cookingStep: _readString(json, ['cookingStep', 'cooking_step']),
      nutrition: nutritionJson is Map<String, dynamic> ? RecipeNutritionModel.fromJson(nutritionJson) : null,
      ingredients: ingredientsJson is List
          ? ingredientsJson.whereType<Map<String, dynamic>>().map(RecipeIngredientModel.fromJson).toList()
          : const [],
      steps: stepsJson is List
          ? stepsJson.whereType<Map<String, dynamic>>().map(RecipeStepModel.fromJson).toList()
          : const [],
      reviews: reviewsJson is List ? reviewsJson.whereType<Map<String, dynamic>>().toList() : const [],
      averageRating: json['averageRating'] == null ? null : _toDouble(json['averageRating']),
      reviewCount: _toInt(json['reviewCount']),
      isFavorite: json['isFavorite'] == true,
    );
  }
}