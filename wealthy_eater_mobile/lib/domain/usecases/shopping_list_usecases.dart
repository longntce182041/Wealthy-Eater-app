import '../entities/shopping_list.dart';
import '../repositories/shopping_list_repository.dart';

/// Add all ingredients from a recipe to the shopping list.
/// The backend automatically accumulates quantities for existing items.
class AddFromRecipeUseCase {
  final ShoppingListRepository _repository;
  const AddFromRecipeUseCase(this._repository);

  Future<List<ShoppingListItemEntity>> call({
    required String recipeId,
    int? servings,
  }) =>
      _repository.addFromRecipe(recipeId: recipeId, servings: servings);
}

/// Fetch the full shopping list (flat + grouped by category).
class GetShoppingListUseCase {
  final ShoppingListRepository _repository;
  const GetShoppingListUseCase(this._repository);

  Future<Map<String, dynamic>> call({int page = 1, int limit = 200}) =>
      _repository.fetchShoppingList(page: page, limit: limit);
}

/// Toggle the purchased status of a single item.
class ToggleShoppingItemUseCase {
  final ShoppingListRepository _repository;
  const ToggleShoppingItemUseCase(this._repository);

  Future<ShoppingListItemEntity> call(String itemId) =>
      _repository.togglePurchased(itemId);
}

/// Remove a single item from the shopping list.
class RemoveShoppingItemUseCase {
  final ShoppingListRepository _repository;
  const RemoveShoppingItemUseCase(this._repository);

  Future<void> call(String itemId) => _repository.removeItem(itemId);
}

/// Clear all purchased items from the shopping list.
class ClearPurchasedUseCase {
  final ShoppingListRepository _repository;
  const ClearPurchasedUseCase(this._repository);

  Future<void> call() => _repository.clearPurchased();
}

/// Clear every item from the shopping list.
class ClearAllShoppingItemsUseCase {
  final ShoppingListRepository _repository;
  const ClearAllShoppingItemsUseCase(this._repository);

  Future<void> call() => _repository.clearAll();
}

/// Fetch shopping list completion statistics.
class GetShoppingStatsUseCase {
  final ShoppingListRepository _repository;
  const GetShoppingStatsUseCase(this._repository);

  Future<Map<String, dynamic>> call() => _repository.fetchStats();
}
