// ---------------------------------------------------------------------------
// shopping_list_model.dart — Data Layer Model
//
// Extends the pure domain entity with JSON serialization / deserialization.
// Maps the exact field names returned by the Wealthy Eater backend
// (`wealthy_eater_backend`) to the entity's typed properties.
//
// Backend response shape (ShoppingList document):
// {
//   "_id":              "string",
//   "user_id":          "string",
//   "ingredient_id":    "string",
//   "ingredient_name":  "string",
//   "quantity":         number,
//   "unit":             "string",
//   "recipe_id":        "string" | null,
//   "category":         "string",
//   "is_purchase":      boolean,
//   "add_at":           "ISO8601 string",
//   "purchase_at":      "ISO8601 string" | null,
//   "created_at":       "ISO8601 string"
// }
// ---------------------------------------------------------------------------

import '../../domain/entities/shopping_list.dart';

/// Data-layer model that knows how to deserialize a backend JSON map into a
/// typed [ShoppingListItemEntity].
///
/// Usage:
/// ```dart
/// final item = ShoppingListItemModel.fromJson(responseData);
/// ```
class ShoppingListItemModel extends ShoppingListItemEntity {
  const ShoppingListItemModel({
    required super.id,
    required super.ingredientId,
    required super.ingredientName,
    required super.quantity,
    required super.unit,
    super.recipeId,
    required super.category,
    super.isPurchased,
    required super.addedAt,
    super.purchasedAt,
  });

  // ── Deserialize from backend JSON ─────────────────────────────────────────

  /// Maps a raw JSON map (as returned by `GET /api/shopping-list`) to a typed
  /// model.  All fields are parsed defensively — missing or null values fall
  /// back to safe defaults so the UI never crashes on partial data.
  factory ShoppingListItemModel.fromJson(Map<String, dynamic> json) {
    return ShoppingListItemModel(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',

      ingredientId: json['ingredient_id']?.toString() ?? '',

      ingredientName: json['ingredient_name']?.toString() ?? 'Unknown',

      // quantity is a Number in MongoDB — guard against both int and double
      quantity: (json['quantity'] as num?)?.toDouble() ?? 1.0,

      unit: json['unit']?.toString() ?? '',

      // recipe_id can be null when items are consolidated across recipes
      recipeId: json['recipe_id']?.toString(),

      category: json['category']?.toString() ?? 'Other',

      isPurchased: json['is_purchase'] as bool? ?? false,

      // add_at / created_at — use whichever timestamp is present
      addedAt: _parseDate(json['add_at']) ??
          _parseDate(json['created_at']) ??
          DateTime.now(),

      purchasedAt: _parseDate(json['purchase_at']),
    );
  }

  // ── Serialize to JSON (for any future caching needs) ─────────────────────

  Map<String, dynamic> toJson() => {
        '_id':             id,
        'ingredient_id':   ingredientId,
        'ingredient_name': ingredientName,
        'quantity':        quantity,
        'unit':            unit,
        if (recipeId != null) 'recipe_id': recipeId,
        'category':        category,
        'is_purchase':     isPurchased,
        'add_at':          addedAt.toIso8601String(),
        if (purchasedAt != null) 'purchase_at': purchasedAt!.toIso8601String(),
      };

  // ── Private helpers ───────────────────────────────────────────────────────

  static DateTime? _parseDate(dynamic raw) {
    if (raw == null) return null;
    try {
      return DateTime.parse(raw.toString());
    } catch (_) {
      return null;
    }
  }
}
