import 'package:dio/dio.dart';

import '../../core/error/app_error.dart';
import '../../core/network/api_client.dart';
import '../../domain/entities/shopping_list.dart';
import '../../domain/repositories/shopping_list_repository.dart';
import '../models/shopping_list_model.dart';

/// Concrete implementation of [ShoppingListRepository].
/// Communicates with the backend via [ApiClient] (a configured Dio wrapper).
///
/// All endpoints are under `/api/user/shopping-list`.
class ShoppingListRepositoryImpl implements ShoppingListRepository {
  final ApiClient _apiClient;

  const ShoppingListRepositoryImpl({required ApiClient apiClient})
      : _apiClient = apiClient;

  // ── addFromRecipe ──────────────────────────────────────────────────────────

  @override
  Future<List<ShoppingListItemEntity>> addFromRecipe({
    required String recipeId,
    int? servings,
  }) async {
    try {
      final response = await _apiClient.post(
        '/api/user/shopping-list/add-from-recipe',
        data: {
          'recipeId': recipeId,
          'servings': ?servings,
        },
      );

      if (response.statusCode == 201 && response.data['success'] == true) {
        final rawItems =
            (response.data['data']?['items'] as List<dynamic>?) ?? [];
        return rawItems
            .whereType<Map<String, dynamic>>()
            .map(ShoppingListItemModel.fromJson)
            .toList();
      }

      throw AppError(
          response.data['error']?['message'] ?? 'Failed to add ingredients');
    } catch (e) {
      throw mapError(e);
    }
  }

  // ── fetchShoppingList ──────────────────────────────────────────────────────

  @override
  Future<Map<String, dynamic>> fetchShoppingList({
    int page  = 1,
    int limit = 200,
  }) async {
    try {
      final response = await _apiClient.get(
        '/api/user/shopping-list',
        queryParameters: {'page': page, 'limit': limit},
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        final rawItems =
            (response.data['data']?['items'] as List<dynamic>?) ?? [];
        final items = rawItems
            .whereType<Map<String, dynamic>>()
            .map(ShoppingListItemModel.fromJson)
            .toList();

        // Rebuild grouped map with typed entities
        final Map<String, List<ShoppingListItemEntity>> grouped = {};
        for (final item in items) {
          grouped.putIfAbsent(item.category, () => []).add(item);
        }

        return {
          'items':      items,
          'grouped':    grouped,
          'pagination': response.data['meta'] ?? {},
        };
      }

      throw AppError(
          response.data['error']?['message'] ?? 'Failed to load shopping list');
    } catch (e) {
      throw mapError(e);
    }
  }

  // ── togglePurchased ────────────────────────────────────────────────────────

  @override
  Future<ShoppingListItemEntity> togglePurchased(String itemId) async {
    try {
      final response =
          await _apiClient.patch('/api/user/shopping-list/$itemId/toggle');

      if (response.statusCode == 200 && response.data['success'] == true) {
        return ShoppingListItemModel.fromJson(
          response.data['data'] as Map<String, dynamic>,
        );
      }

      throw AppError(
          response.data['error']?['message'] ?? 'Failed to toggle item');
    } catch (e) {
      throw mapError(e);
    }
  }

  // ── removeItem ─────────────────────────────────────────────────────────────

  @override
  Future<void> removeItem(String itemId) async {
    try {
      final response =
          await _apiClient.delete('/api/user/shopping-list/$itemId');

      if (response.statusCode != 200 || response.data['success'] != true) {
        throw AppError(
            response.data['error']?['message'] ?? 'Failed to remove item');
      }
    } catch (e) {
      throw mapError(e);
    }
  }

  // ── clearPurchased ─────────────────────────────────────────────────────────

  @override
  Future<void> clearPurchased() async {
    try {
      final response =
          await _apiClient.delete('/api/user/shopping-list/clear/purchased');

      if (response.statusCode != 200 || response.data['success'] != true) {
        throw AppError(
            response.data['error']?['message'] ?? 'Failed to clear purchased');
      }
    } catch (e) {
      throw mapError(e);
    }
  }

  // ── clearAll ───────────────────────────────────────────────────────────────

  @override
  Future<void> clearAll() async {
    try {
      final response =
          await _apiClient.delete('/api/user/shopping-list/clear/all');

      if (response.statusCode != 200 || response.data['success'] != true) {
        throw AppError(
            response.data['error']?['message'] ?? 'Failed to clear all items');
      }
    } catch (e) {
      throw mapError(e);
    }
  }

  // ── fetchStats ─────────────────────────────────────────────────────────────

  @override
  Future<Map<String, dynamic>> fetchStats() async {
    try {
      final response = await _apiClient.get('/api/user/shopping-list/stats');

      if (response.statusCode == 200 && response.data['success'] == true) {
        return response.data['data'] as Map<String, dynamic>? ?? {};
      }

      throw AppError(
          response.data['error']?['message'] ?? 'Failed to fetch stats');
    } catch (e) {
      throw mapError(e);
    }
  }
}
