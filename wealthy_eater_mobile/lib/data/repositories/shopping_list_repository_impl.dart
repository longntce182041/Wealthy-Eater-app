import 'package:dio/dio.dart';

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

      throw Exception(
          response.data['error']?['message'] ?? 'Failed to add ingredients');
    } on DioException catch (e) {
      final msg = e.response?.data?['error']?['message'] as String?;
      throw Exception(msg ?? e.message ?? 'Failed to add ingredients');
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

      throw Exception(
          response.data['error']?['message'] ?? 'Failed to load shopping list');
    } on DioException catch (e) {
      final msg = e.response?.data?['error']?['message'] as String?;
      throw Exception(msg ?? e.message ?? 'Failed to load shopping list');
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

      throw Exception(
          response.data['error']?['message'] ?? 'Failed to toggle item');
    } on DioException catch (e) {
      final msg = e.response?.data?['error']?['message'] as String?;
      throw Exception(msg ?? e.message ?? 'Failed to toggle item');
    }
  }

  // ── removeItem ─────────────────────────────────────────────────────────────

  @override
  Future<void> removeItem(String itemId) async {
    try {
      final response =
          await _apiClient.delete('/api/user/shopping-list/$itemId');

      if (response.statusCode != 200 || response.data['success'] != true) {
        throw Exception(
            response.data['error']?['message'] ?? 'Failed to remove item');
      }
    } on DioException catch (e) {
      final msg = e.response?.data?['error']?['message'] as String?;
      throw Exception(msg ?? e.message ?? 'Failed to remove item');
    }
  }

  // ── clearPurchased ─────────────────────────────────────────────────────────

  @override
  Future<void> clearPurchased() async {
    try {
      final response =
          await _apiClient.delete('/api/user/shopping-list/clear/purchased');

      if (response.statusCode != 200 || response.data['success'] != true) {
        throw Exception(
            response.data['error']?['message'] ?? 'Failed to clear purchased');
      }
    } on DioException catch (e) {
      final msg = e.response?.data?['error']?['message'] as String?;
      throw Exception(msg ?? e.message ?? 'Failed to clear purchased');
    }
  }

  // ── clearAll ───────────────────────────────────────────────────────────────

  @override
  Future<void> clearAll() async {
    try {
      final response =
          await _apiClient.delete('/api/user/shopping-list/clear/all');

      if (response.statusCode != 200 || response.data['success'] != true) {
        throw Exception(
            response.data['error']?['message'] ?? 'Failed to clear all items');
      }
    } on DioException catch (e) {
      final msg = e.response?.data?['error']?['message'] as String?;
      throw Exception(msg ?? e.message ?? 'Failed to clear all items');
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

      throw Exception(
          response.data['error']?['message'] ?? 'Failed to fetch stats');
    } on DioException catch (e) {
      final msg = e.response?.data?['error']?['message'] as String?;
      throw Exception(msg ?? e.message ?? 'Failed to fetch stats');
    }
  }
}
