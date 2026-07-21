class DraftUpdateRequest {
  final List<DraftItemUpdate> items;

  DraftUpdateRequest({required this.items});

  Map<String, dynamic> toJson() => {
        'items': items.map((i) => i.toJson()).toList(),
      };
}

class DraftItemUpdate {
  final String itemId;
  final String? recipeId;
  final String? mealType;
  final num? customizedServingsGram;
  final num? targetCalories;
  final List<IngredientUpdate>? ingredients;

  DraftItemUpdate({
    required this.itemId,
    this.recipeId,
    this.mealType,
    this.customizedServingsGram,
    this.targetCalories,
    this.ingredients,
  });

  Map<String, dynamic> toJson() {
    final data = <String, dynamic>{
      'itemId': itemId,
    };
    if (recipeId != null) {
      data['recipe_id'] = recipeId;
    }
    if (mealType != null) {
      data['meal_type'] = mealType;
    }
    if (customizedServingsGram != null) {
      data['customized_servings_gram'] = customizedServingsGram;
    }
    if (targetCalories != null) {
      data['target_calories'] = targetCalories;
    }
    if (ingredients != null) {
      data['ingredients'] = ingredients!.map((i) => i.toJson()).toList();
    }
    return data;
  }
}

class IngredientUpdate {
  final String ingredientId;
  final num grams;

  IngredientUpdate({
    required this.ingredientId,
    required this.grams,
  });

  Map<String, dynamic> toJson() => {
        'ingredientId': ingredientId,
        'grams': grams,
      };
}
