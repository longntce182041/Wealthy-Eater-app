import 'package:flutter/foundation.dart';

import '../../domain/entities/shopping_list.dart';
import '../../domain/usecases/shopping_list_usecases.dart';
import '../../core/error/app_error.dart';

/// View-state enum — mirrors the pattern used by RecipeProvider.
enum ShoppingListViewState { initial, loading, success, error }

/// Manages the complete state for the Smart Grocery / Shopping List feature.
///
/// Follows the ChangeNotifier + Provider pattern established throughout the
/// Wealthy Eater mobile app (consistent with AuthProvider and RecipeProvider).
///
/// State managed:
/// - [items]        — flat list of all items (used for stats computation)
/// - [grouped]      — items grouped by category (used for the checklist UI)
/// - [viewState]    — loading / success / error
/// - [errorMessage] — human-readable error text shown in the UI
/// - [isAdding]     — true while addFromRecipe API call is in-flight
///                    (controls loading indicator on the "Add" button)
///
/// Optimistic UI strategy:
/// - [togglePurchased] and [removeItem] update local state immediately, then
///   confirm with the server.  On server failure the list is reloaded from the
///   API to restore consistency.
/// - [addFromRecipe] is NOT optimistic: we wait for the server response so that
///   the UI always shows the server-accumulated quantities.
class ShoppingListProvider extends ChangeNotifier {
  // ── Use Cases ──────────────────────────────────────────────────────────────
  final AddFromRecipeUseCase         _addFromRecipe;
  final GetShoppingListUseCase       _getList;
  final ToggleShoppingItemUseCase    _toggleItem;
  final RemoveShoppingItemUseCase    _removeItem;
  final ClearPurchasedUseCase        _clearPurchased;
  final ClearAllShoppingItemsUseCase _clearAll;
  final GetShoppingStatsUseCase      _getStats;

  ShoppingListProvider({
    required AddFromRecipeUseCase         addFromRecipeUseCase,
    required GetShoppingListUseCase       getShoppingListUseCase,
    required ToggleShoppingItemUseCase    toggleShoppingItemUseCase,
    required RemoveShoppingItemUseCase    removeShoppingItemUseCase,
    required ClearPurchasedUseCase        clearPurchasedUseCase,
    required ClearAllShoppingItemsUseCase clearAllShoppingItemsUseCase,
    required GetShoppingStatsUseCase      getShoppingStatsUseCase,
  })  : _addFromRecipe  = addFromRecipeUseCase,
        _getList        = getShoppingListUseCase,
        _toggleItem     = toggleShoppingItemUseCase,
        _removeItem     = removeShoppingItemUseCase,
        _clearPurchased = clearPurchasedUseCase,
        _clearAll       = clearAllShoppingItemsUseCase,
        _getStats       = getShoppingStatsUseCase;

  // ── State ──────────────────────────────────────────────────────────────────

  ShoppingListViewState viewState   = ShoppingListViewState.initial;
  String?               errorMessage;
  bool                  isAdding    = false;
  bool                  isAddSuccess = false; // flash-once success signal

  List<ShoppingListItemEntity>                     items   = const [];
  Map<String, List<ShoppingListItemEntity>>        grouped = const {};

  // ── Computed ───────────────────────────────────────────────────────────────

  ShoppingListStatsEntity get stats =>
      ShoppingListStatsEntity.fromItems(items);

  List<ShoppingListItemEntity> get pendingItems =>
      items.where((i) => !i.isPurchased).toList();

  List<ShoppingListItemEntity> get purchasedItems =>
      items.where((i) => i.isPurchased).toList();

  /// Returns true if at least one un-purchased ingredient from this recipe exists.
  bool isRecipePending(String recipeId) {
    return pendingItems.any((item) => item.recipeId == recipeId);
  }

  // ── Load ───────────────────────────────────────────────────────────────────

  /// Fetch the full list from the server.  Called on tab activation and after
  /// any mutation that needs a server-confirmed refresh.
  Future<void> loadList({bool silent = false}) async {
    if (!silent) {
      viewState    = ShoppingListViewState.loading;
      errorMessage = null;
      notifyListeners();
    }

    try {
      final result = await _getList();
      _applyResult(result);
      viewState = ShoppingListViewState.success;
    } catch (e) {
      viewState    = ShoppingListViewState.error;
      errorMessage = mapError(e).message;
    }
    notifyListeners();
  }

  // ── Add from Recipe ────────────────────────────────────────────────────────

  /// Add all ingredients from [recipeId] to the shopping list.
  /// The server accumulates quantities for duplicates automatically.
  ///
  /// Returns [true] on success, [false] on failure.
  Future<bool> addFromRecipe(String recipeId, {int? servings}) async {
    isAdding     = true;
    isAddSuccess = false;
    errorMessage = null;
    notifyListeners();

    try {
      await _addFromRecipe(recipeId: recipeId, servings: servings);
      // Reload to get server-confirmed quantities
      await loadList(silent: true);
      isAdding     = false;
      isAddSuccess = true;
      notifyListeners();
      // Clear the success flag after a short delay so the UI can react once
      Future.delayed(const Duration(seconds: 2), () {
        isAddSuccess = false;
        notifyListeners();
      });
      return true;
    } catch (e) {
      isAdding     = false;
      errorMessage = mapError(e).message;
      notifyListeners();
      return false;
    }
  }

  // ── Toggle ─────────────────────────────────────────────────────────────────

  /// Toggle the purchased status.  Optimistic: update UI immediately,
  /// revert on failure.
  Future<void> togglePurchased(String itemId) async {
    errorMessage = null;
    // Optimistic local update
    _mutateItem(itemId, (item) => item.copyWith(
          isPurchased: !item.isPurchased,
          purchasedAt: !item.isPurchased ? DateTime.now() : null,
        ));
    notifyListeners();

    try {
      final updated = await _toggleItem(itemId);
      // Replace with server-confirmed value
      _replaceItem(itemId, updated);
      notifyListeners();
    } catch (e) {
      // Revert: reload from server
      errorMessage = 'Sync failed — reloading list';
      notifyListeners();
      await loadList(silent: true);
    }
  }

  // ── Remove ─────────────────────────────────────────────────────────────────

  /// Remove an item.  Optimistic: remove from UI immediately, reload on error.
  Future<void> removeItem(String itemId) async {
    errorMessage = null;
    final removedItemIndex = items.indexWhere((i) => i.id == itemId);
    if (removedItemIndex == -1) return;
    
    final removedItem = items[removedItemIndex];

    // Optimistic local remove
    items = List.from(items)..removeAt(removedItemIndex);
    grouped = _buildGrouped(items);
    notifyListeners();

    try {
      await _removeItem(itemId);
    } catch (e) {
      // Revert just this item
      errorMessage = 'Failed to remove item';
      
      // Re-insert at the original index if possible, otherwise add to end
      final newItems = List<ShoppingListItemEntity>.from(items);
      if (removedItemIndex <= newItems.length) {
        newItems.insert(removedItemIndex, removedItem);
      } else {
        newItems.add(removedItem);
      }
      
      items = newItems;
      grouped = _buildGrouped(items);
      notifyListeners();
    }
  }

  // ── Clear Purchased ────────────────────────────────────────────────────────

  Future<void> clearPurchased() async {
    errorMessage = null;
    // Optimistic: remove all purchased items from local state
    items   = items.where((i) => !i.isPurchased).toList();
    grouped = _buildGrouped(items);
    notifyListeners();

    try {
      await _clearPurchased();
    } catch (e) {
      errorMessage = 'Failed to clear purchased items';
      notifyListeners();
      await loadList(silent: true); // Restore server state
    }
  }

  // ── Clear All ──────────────────────────────────────────────────────────────

  Future<void> clearAll() async {
    errorMessage = null;
    items   = const [];
    grouped = const {};
    notifyListeners();

    try {
      await _clearAll();
    } catch (e) {
      errorMessage = 'Failed to clear all items';
      notifyListeners();
      await loadList(silent: true);
    }
  }

  // ── Refresh & Error Management ─────────────────────────────────────────────

  Future<void> refresh() => loadList();

  void clearError() {
    errorMessage = null;
    notifyListeners();
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  void _applyResult(Map<String, dynamic> result) {
    items   = (result['items'] as List<ShoppingListItemEntity>?) ?? const [];
    grouped = (result['grouped'] as Map<String, List<ShoppingListItemEntity>>?)
        ?? const {};
  }

  /// Build grouped map from a flat list.
  Map<String, List<ShoppingListItemEntity>> _buildGrouped(
      List<ShoppingListItemEntity> list) {
    final Map<String, List<ShoppingListItemEntity>> g = {};
    for (final item in list) {
      g.putIfAbsent(item.category, () => []).add(item);
    }
    return g;
  }

  /// Apply a mutation function to a single item (for optimistic updates).
  void _mutateItem(
      String itemId, ShoppingListItemEntity Function(ShoppingListItemEntity) fn) {
    items   = items.map((i) => i.id == itemId ? fn(i) : i).toList();
    grouped = _buildGrouped(items);
  }

  /// Replace a single item with the server-confirmed version.
  void _replaceItem(String itemId, ShoppingListItemEntity updated) {
    items   = items.map((i) => i.id == itemId ? updated : i).toList();
    grouped = _buildGrouped(items);
  }
}
