// ---------------------------------------------------------------------------
// shopping_list.dart — Domain Entities
//
// Pure domain layer: no Flutter, no I/O, no JSON parsing.
// The concrete data layer (shopping_list_model.dart) extends these classes
// and adds fromJson / toJson.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// ShoppingListItemEntity
// ---------------------------------------------------------------------------

/// Represents a single line-item in a user's grocery / shopping list.
///
/// Fields mirror the backend `ShoppingList` Mongoose document.
/// `quantity` and `unit` are always present (enforced by both backend schema
/// and the smart accumulation algorithm).
class ShoppingListItemEntity {
  /// MongoDB ObjectID (string form) — empty string before first server sync.
  final String id;

  /// Reference to the `Ingredient` master record.
  final String ingredientId;

  /// Snapshot of the ingredient name at the time it was added.
  /// Preserved even if the master Ingredient is later renamed.
  final String ingredientName;

  /// Numeric quantity to purchase (e.g. 2, 1.5, 0.25).
  final double quantity;

  /// Unit of measurement matching the recipe (e.g. "g", "ml", "cups").
  final String unit;

  /// Optional reference to the source recipe (null when consolidated from
  /// multiple recipes).
  final String? recipeId;

  /// Ingredient category used to group the checklist (e.g. "Protein",
  /// "Vegetable", "Dairy", "Other").
  final String category;

  /// Whether the user has ticked this item off in the store.
  final bool isPurchased;

  /// Timestamp when this item was added to the list.
  final DateTime addedAt;

  /// Timestamp when the user marked this item as purchased (null if pending).
  final DateTime? purchasedAt;

  const ShoppingListItemEntity({
    required this.id,
    required this.ingredientId,
    required this.ingredientName,
    required this.quantity,
    required this.unit,
    this.recipeId,
    required this.category,
    this.isPurchased = false,
    required this.addedAt,
    this.purchasedAt,
  });

  // ── Derived helpers ──────────────────────────────────────────────────────

  /// Human-readable quantity string for UI display.
  ///
  /// Examples:
  /// - `2.0 g`     →  `"2 g"`      (integer quantities drop the decimal)
  /// - `1.5 cups`  →  `"1.5 cups"`
  String get displayQuantity {
    final isWhole = quantity == quantity.truncateToDouble();
    final qStr = isWhole ? quantity.toInt().toString() : quantity.toString();
    return '$qStr $unit';
  }

  // ── Immutable copy ───────────────────────────────────────────────────────

  ShoppingListItemEntity copyWith({
    String? id,
    String? ingredientId,
    String? ingredientName,
    double? quantity,
    String? unit,
    String? recipeId,
    String? category,
    bool? isPurchased,
    DateTime? addedAt,
    DateTime? purchasedAt,
  }) {
    return ShoppingListItemEntity(
      id:             id             ?? this.id,
      ingredientId:   ingredientId   ?? this.ingredientId,
      ingredientName: ingredientName ?? this.ingredientName,
      quantity:       quantity       ?? this.quantity,
      unit:           unit           ?? this.unit,
      recipeId:       recipeId       ?? this.recipeId,
      category:       category       ?? this.category,
      isPurchased:    isPurchased    ?? this.isPurchased,
      addedAt:        addedAt        ?? this.addedAt,
      purchasedAt:    purchasedAt    ?? this.purchasedAt,
    );
  }

  // ── Equality ─────────────────────────────────────────────────────────────

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ShoppingListItemEntity &&
          runtimeType == other.runtimeType &&
          id == other.id;

  @override
  int get hashCode => id.hashCode;
}

// ---------------------------------------------------------------------------
// ShoppingListStatsEntity
// ---------------------------------------------------------------------------

/// Aggregated completion metrics for the grocery list.
///
/// All fields are computed server-side or from the local item list.
/// Used to drive the progress bar and summary header in the UI.
///
/// Example:
/// ```dart
/// if (stats.isComplete) showConfetti();
/// LinearProgressIndicator(value: stats.completionFraction);
/// Text('${stats.purchased} / ${stats.total} items');
/// ```
class ShoppingListStatsEntity {
  final int total;
  final int purchased;
  final int pending;

  const ShoppingListStatsEntity({
    required this.total,
    required this.purchased,
    required this.pending,
  });

  /// Factory that computes stats from a list of items (client-side).
  factory ShoppingListStatsEntity.fromItems(
      List<ShoppingListItemEntity> items) {
    final purchasedCount = items.where((i) => i.isPurchased).length;
    return ShoppingListStatsEntity(
      total:     items.length,
      purchased: purchasedCount,
      pending:   items.length - purchasedCount,
    );
  }

  /// Completion as a fraction in [0.0, 1.0] — safe against empty lists.
  double get completionFraction =>
      total > 0 ? purchased / total : 0.0;

  /// Completion percentage [0, 100].
  double get completionPercentage => completionFraction * 100;

  /// True only when the list is non-empty AND every item is purchased.
  bool get isComplete => total > 0 && purchased == total;

  /// True when there are no items at all.
  bool get isEmpty => total == 0;
}
