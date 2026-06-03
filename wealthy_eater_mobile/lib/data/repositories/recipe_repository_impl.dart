import 'package:dio/dio.dart';

import '../../core/network/api_client.dart';
import '../../domain/entities/recipe.dart';
import '../../domain/repositories/recipe_repository.dart';
import '../models/recipe_model.dart';

class RecipeRepositoryImpl implements RecipeRepository {
  final ApiClient apiClient;

  RecipeRepositoryImpl({required this.apiClient});

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
        '/api/recipes',
        queryParameters: {
          if (search.trim().isNotEmpty) 'search': search.trim(),
          if (status.trim().isNotEmpty) 'status': status.trim(),
          if (difficulty.trim().isNotEmpty) 'level': difficulty.trim(),
          if (minTime != null) 'minTime': minTime,
          if (maxTime != null) 'maxTime': maxTime,
          if (minCalories != null) 'minCalories': minCalories,
          if (maxCalories != null) 'maxCalories': maxCalories,
          if (sortBy != null && sortBy.isNotEmpty) 'sortBy': sortBy,
          'limit': 50,
        },
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        final items = (response.data['data'] as List? ?? const []);
        return items.whereType<Map<String, dynamic>>().map(RecipeModel.fromJson).toList();
      }

      throw Exception(response.data['message'] ?? 'Unable to load recipes');
    } on DioException catch (error) {
      throw Exception(error.response?.data?['message'] ?? error.message ?? 'Unable to load recipes');
    }
  }

  @override
  Future<RecipeEntity> fetchRecipeDetail(String id) async {
    try {
      final response = await apiClient.get('/api/recipes/$id');

      if (response.statusCode == 200 && response.data['success'] == true) {
        final data = response.data['data'];
        if (data is Map<String, dynamic>) {
          return RecipeModel.fromJson(data);
        }
      }

      throw Exception(response.data['message'] ?? 'Unable to load recipe detail');
    } on DioException catch (error) {
      throw Exception(error.response?.data?['message'] ?? error.message ?? 'Unable to load recipe detail');
    }
  }
}