/// meal_image_scan_model.dart — Data models for the camera meal scanner API.
library;

class MealImageScanResult {
  final String mealName;
  final double confidence;
  final List<MealImageScanIngredient> ingredients;
  final MealImageScanTotals totals;
  final String note;
  final String? recipeId;
  final bool matchedInSystem;

  const MealImageScanResult({
    required this.mealName,
    required this.confidence,
    required this.ingredients,
    required this.totals,
    required this.note,
    this.recipeId,
    this.matchedInSystem = false,
  });

  factory MealImageScanResult.fromJson(Map<String, dynamic> json) {
    final rawIngredients = (json['ingredients'] as List?) ?? const [];
    final double rawConf = _toDouble(json['confidence']);
    // Normalize percentage or raw float and clamp strictly to 2D visual max (max 0.80)
    final double normalizedConf = rawConf > 1.0 ? (rawConf / 100.0) : rawConf;
    final double clampedConf = (normalizedConf == 0.0)
        ? 0.55
        : normalizedConf.clamp(0.30, 0.80);

    return MealImageScanResult(
      mealName: (json['meal_name'] as String?) ?? 'Unknown Meal',
      confidence: clampedConf,
      ingredients: rawIngredients
          .whereType<Map>()
          .map((e) =>
              MealImageScanIngredient.fromJson(Map<String, dynamic>.from(e)))
          .toList(),
      totals: MealImageScanTotals.fromJson(
        Map<String, dynamic>.from((json['totals'] as Map?) ?? const {}),
      ),
      note: (json['note'] as String?) ??
          '⚠️ Reference Warning: Nutritional values and portion amounts are estimated from 2D AI image analysis.',
      recipeId: json['recipe_id']?.toString() ?? json['recipeId']?.toString(),
      matchedInSystem: json['matched_in_system'] as bool? ?? false,
    );
  }
}

class MealImageScanIngredient {
  final String inputName;
  final String? matchedName;
  final double? estimatedAmount;
  final String? estimatedUnit;
  final double? convertedAmount;
  final String? convertedUnit;
  final String? dbUnit;
  final MealImageScanNutrition nutrition;
  final String status;

  const MealImageScanIngredient({
    required this.inputName,
    required this.matchedName,
    required this.estimatedAmount,
    required this.estimatedUnit,
    required this.convertedAmount,
    required this.convertedUnit,
    required this.dbUnit,
    required this.nutrition,
    required this.status,
  });

  factory MealImageScanIngredient.fromJson(Map<String, dynamic> json) {
    // Standardize sub-object maps for flexible n8n format
    final rawNutrition = (json['nutrition'] as Map?) ?? {
      'kcal': json['kcal'] ?? json['calories'] ?? json['kcal_amount'] ?? 0.0,
      'protein': json['protein'] ?? 0.0,
      'carbs': json['carbs'] ?? 0.0,
      'fats': json['fats'] ?? json['fat'] ?? 0.0,
    };

    return MealImageScanIngredient(
      inputName: (json['input_name'] ?? json['name'] ?? '') as String,
      matchedName: (json['matched_name'] ?? json['name']) as String?,
      estimatedAmount: _toNullableDouble(json['estimated_amount'] ?? json['quantity'] ?? json['amount']),
      estimatedUnit: (json['estimated_unit'] ?? json['unit'] ?? 'g') as String?,
      convertedAmount: _toNullableDouble(json['converted_amount'] ?? json['quantity'] ?? json['amount']),
      convertedUnit: (json['converted_unit'] ?? json['unit'] ?? 'g') as String?,
      dbUnit: json['db_unit'] as String?,
      nutrition: MealImageScanNutrition.fromJson(
        Map<String, dynamic>.from(rawNutrition),
      ),
      status: (json['status'] as String?) ?? 'ok',
    );
  }
}

class MealImageScanNutrition {
  final double kcal;
  final double protein;
  final double carbs;
  final double fats;

  const MealImageScanNutrition({
    required this.kcal,
    required this.protein,
    required this.carbs,
    required this.fats,
  });

  factory MealImageScanNutrition.fromJson(Map<String, dynamic> json) {
    return MealImageScanNutrition(
      kcal: _toDouble(json['kcal'] ?? json['calories'] ?? json['kcal_amount']),
      protein: _toDouble(json['protein']),
      carbs: _toDouble(json['carbs']),
      fats: _toDouble(json['fats'] ?? json['fat']),
    );
  }
}

class MealImageScanTotals {
  final double kcal;
  final double protein;
  final double carbs;
  final double fats;

  const MealImageScanTotals({
    required this.kcal,
    required this.protein,
    required this.carbs,
    required this.fats,
  });

  factory MealImageScanTotals.fromJson(Map<String, dynamic> json) {
    return MealImageScanTotals(
      kcal: _toDouble(json['kcal'] ?? json['calories'] ?? json['kcal_amount']),
      protein: _toDouble(json['protein']),
      carbs: _toDouble(json['carbs']),
      fats: _toDouble(json['fats'] ?? json['fat']),
    );
  }
}

double _toDouble(dynamic value) {
  if (value is num) return value.toDouble();
  return double.tryParse(value?.toString() ?? '') ?? 0.0;
}

double? _toNullableDouble(dynamic value) {
  if (value == null) return null;
  if (value is num) return value.toDouble();
  return double.tryParse(value.toString());
}
