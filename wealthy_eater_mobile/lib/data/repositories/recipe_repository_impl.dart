import 'package:dio/dio.dart';

import '../../core/network/api_client.dart';
import '../../domain/entities/recipe.dart';
import '../../domain/repositories/recipe_repository.dart';
import '../models/recipe_model.dart';

class RecipeRepositoryImpl implements RecipeRepository {
  final ApiClient apiClient;

  RecipeRepositoryImpl({required this.apiClient});

  // ── Browse ────────────────────────────────────────────────────────────────

  @override
  Future<List<RecipeEntity>> fetchRecipes({
    String search = '',
    String status = '',
    String difficulty = '',
    int? minTime,
    int? maxTime,
    int? minCalories,
    int? maxCalories,
    String? sortBy,
  }) async {
    try {
      final response = await apiClient.get(
        '/api/user/recipes',
        queryParameters: {
          if (search.trim().isNotEmpty) 'search': search.trim(),
          if (status.trim().isNotEmpty) 'status': status.trim(),
          if (difficulty.trim().isNotEmpty) 'level': difficulty.trim(),
          'minTime':     minTime,
          'maxTime':     maxTime,
          'minCalories': minCalories,
          'maxCalories': maxCalories,
          if (sortBy != null && sortBy.isNotEmpty) 'sortBy': sortBy,
          'limit': 50,
        }..removeWhere((_, v) => v == null),

      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        final items = (response.data['data'] as List? ?? const []);
        return items.whereType<Map<String, dynamic>>().map(RecipeModel.fromJson).toList();
      }

      throw Exception(response.data['message'] ?? 'Unable to load recipes');
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? e.message ?? 'Unable to load recipes');
    }
  }

  @override
  Future<RecipeEntity> fetchRecipeDetail(String id) async {
    try {
      final response = await apiClient.get('/api/user/recipes/$id');

      if (response.statusCode == 200 && response.data['success'] == true) {
        final data = response.data['data'];
        if (data is Map<String, dynamic>) {
          return RecipeModel.fromJson(data);
        }
      }

      throw Exception(response.data['message'] ?? 'Unable to load recipe detail');
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? e.message ?? 'Unable to load recipe detail');
    }
  }

  // ── Likes ─────────────────────────────────────────────────────────────────

  @override
  Future<({bool isLiked, String action})> toggleLike(String recipeId) async {
    try {
      final response = await apiClient.post('/api/user/recipes/$recipeId/like');

      if (response.statusCode != null &&
          response.statusCode! >= 200 &&
          response.statusCode! < 300 &&
          response.data['success'] == true) {
        final data = response.data['data'] as Map<String, dynamic>;
        return (
          isLiked: data['isLiked'] == true,
          action:  (data['action'] as String?) ?? 'toggled',
        );
      }

      throw Exception(response.data['message'] ?? 'Failed to toggle like');
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? e.message ?? 'Failed to toggle like');
    }
  }

  @override
  Future<Map<String, dynamic>> fetchLikedRecipes({int page = 1, int limit = 20}) async {
    try {
      final response = await apiClient.get(
        '/api/user/recipes/liked',
        queryParameters: {'page': page, 'limit': limit},
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        return {
          'items': response.data['data'] as List? ?? [],
          'meta':  response.data['meta']  as Map?  ?? {},
        };
      }

      throw Exception(response.data['message'] ?? 'Unable to load liked recipes');
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? e.message ?? 'Unable to load liked recipes');
    }
  }

  @override
  Future<({bool isLiked, int likeCount})> fetchLikeStatus(String recipeId) async {
    try {
      final response = await apiClient.get('/api/user/recipes/$recipeId/like/status');

      if (response.statusCode == 200 && response.data['success'] == true) {
        final data = response.data['data'] as Map<String, dynamic>;
        return (
          isLiked:   data['isLiked'] == true,
          likeCount: (data['likeCount'] as num?)?.toInt() ?? 0,
        );
      }

      return (isLiked: false, likeCount: 0);
    } on DioException catch (_) {
      return (isLiked: false, likeCount: 0);
    }
  }

  // ── Reviews ───────────────────────────────────────────────────────────────

  @override
  Future<RecipeReviewEntity> upsertReview({
    required String recipeId,
    required int rating,
    String comment = '',
  }) async {
    try {
      final response = await apiClient.post(
        '/api/user/recipes/$recipeId/reviews',
        data: {'rating': rating, 'comment': comment},
      );

      if (response.statusCode != null &&
          response.statusCode! >= 200 &&
          response.statusCode! < 300 &&
          response.data['success'] == true) {
        final data = response.data['data'] as Map<String, dynamic>;
        return RecipeReviewModel.fromJson(data);
      }

      throw Exception(response.data['message'] ?? 'Failed to submit review');
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? e.message ?? 'Failed to submit review');
    }
  }

  @override
  Future<Map<String, dynamic>> fetchRecipeReviews(
    String recipeId, {
    int page = 1,
    int limit = 10,
    String sortOrder = 'desc',
  }) async {
    try {
      final response = await apiClient.get(
        '/api/user/recipes/$recipeId/reviews',
        queryParameters: {'page': page, 'limit': limit, 'sortOrder': sortOrder},
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        final data = response.data['data'] as Map<String, dynamic>;
        final rawReviews = data['reviews'] as List? ?? [];
        return {
          'reviews': rawReviews
              .whereType<Map<String, dynamic>>()
              .map(RecipeReviewModel.fromJson)
              .toList(),
          'stats': data['stats'] as Map<String, dynamic>? ?? {},
          'meta':  response.data['meta']  as Map?            ?? {},
        };
      }

      throw Exception(response.data['message'] ?? 'Unable to load reviews');
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? e.message ?? 'Unable to load reviews');
    }
  }

  @override
  Future<RecipeReviewEntity?> fetchMyReview(String recipeId) async {
    try {
      final response = await apiClient.get('/api/user/recipes/$recipeId/reviews/mine');

      if (response.statusCode == 200 && response.data['success'] == true) {
        final data = response.data['data'] as Map<String, dynamic>;
        final reviewJson = data['review'];
        if (reviewJson == null) return null;
        if (reviewJson is Map<String, dynamic>) {
          return RecipeReviewModel.fromJson(reviewJson);
        }
      }

      return null;
    } on DioException catch (_) {
      return null;
    }
  }

  @override
  Future<void> deleteReview(String reviewId) async {
    try {
      await apiClient.delete('/api/user/recipes/reviews/$reviewId');
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? e.message ?? 'Failed to delete review');
    }
  }

  // ── My Reviews ─────────────────────────────────────────────────────────

  @override
  Future<Map<String, dynamic>> fetchAllMyReviews({int page = 1, int limit = 10, String sortOrder = 'desc'}) async {
    try {
      final response = await apiClient.get(
        '/api/user/recipes/reviews/mine',
        queryParameters: {'page': page, 'limit': limit, 'sortOrder': sortOrder},
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        return {
          'items': response.data['data'] as List? ?? [],
          'meta':  response.data['meta']  as Map?  ?? {},
        };
      }

      throw Exception(response.data['message'] ?? 'Unable to load your reviews');
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? e.message ?? 'Unable to load your reviews');
    }
  }
}