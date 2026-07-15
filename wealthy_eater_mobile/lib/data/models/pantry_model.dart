/// pantry_model.dart — Model for pantry ingredients mapped to Backend JSON.

class PantryIngredient {
  final String name;
  final double quantity;
  final String unit;
  final DateTime? updatedAt;
  final String? ingredientId;

  PantryIngredient({
    required this.name,
    required this.quantity,
    required this.unit,
    this.updatedAt,
    this.ingredientId,
  });

  /// Map raw JSON from Backend into typed model.
  factory PantryIngredient.fromJson(Map<String, dynamic> json) {
    return PantryIngredient(
      name: json['name']?.toString() ?? '',
      quantity: (json['quantity'] as num?)?.toDouble() ?? 0.0,
      unit: json['unit']?.toString() ?? 'g',
      updatedAt: _parseDate(json['updatedAt'] ?? json['updated_at']),
      ingredientId: json['ingredient_id']?.toString() ?? json['ingredientId']?.toString(),
    );
  }

  /// Serialize model into JSON payload.
  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'quantity': quantity,
      'unit': unit,
      if (updatedAt != null) 'updatedAt': updatedAt!.toIso8601String(),
      if (ingredientId != null) 'ingredient_id': ingredientId,
    };
  }

  PantryIngredient copyWith({
    String? name,
    double? quantity,
    String? unit,
    DateTime? updatedAt,
    String? ingredientId,
  }) {
    return PantryIngredient(
      name: name ?? this.name,
      quantity: quantity ?? this.quantity,
      unit: unit ?? this.unit,
      updatedAt: updatedAt ?? this.updatedAt,
      ingredientId: ingredientId ?? this.ingredientId,
    );
  }

  static DateTime? _parseDate(dynamic raw) {
    if (raw == null) return null;
    try {
      return DateTime.parse(raw.toString()).toLocal();
    } catch (_) {
      return null;
    }
  }
}
