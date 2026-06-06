import '../entities/shopping_list.dart';

/// Abstract contract for all shopping list data operations.
///
/// The concrete implementation lives in
/// `data/repositories/shopping_list_repository_impl.dart`.
///
/// Using an interface here keeps the service layer decoupled from the
/// network layer and makes unit testing straightforward.
abstract class ShoppingListRepository {
  /// Add all ingredients from [recipeId] to the user's shopping list.
  /// The backend smart-accumulates quantities for existing un-purchased items.
  ///
  /// [servings] is an optional multiplier; defaults to the recipe's
  /// `base_servings` on the server side.
  Future<List<ShoppingListItemEntity>> addFromRecipe({
    required String recipeId,
    int? servings,
  });

  /// Fetch the current user's full shopping list.
  /// Returns both the flat list and a map grouped by category.
  Future<Map<String, dynamic>> fetchShoppingList({
    int page,
    int limit,
  });

  /// Toggle the purchased status of a single item.
  Future<ShoppingListItemEntity> togglePurchased(String itemId);

  /// Permanently delete a single item.
  Future<void> removeItem(String itemId);

  /// Remove all items marked as purchased.
  Future<void> clearPurchased();

  /// Remove every item (purchased + un-purchased).
  Future<void> clearAll();

  /// Fetch completion statistics.
  Future<Map<String, dynamic>> fetchStats();
}
