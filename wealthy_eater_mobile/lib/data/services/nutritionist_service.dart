import 'dart:io';
import 'package:dio/dio.dart';
import '../../core/error/app_error.dart';
import '../../core/network/api_client.dart';
import '../models/nutritionist_model.dart';

class NutritionistService {
  final ApiClient apiClient;

  NutritionistService({required this.apiClient});

  Future<List<NutritionistModel>> fetchNutritionists() async {
    try {
      final response = await apiClient.get('/api/nutritionists');

      if (response.statusCode == 200 && response.data['success'] == true) {
        final items = (response.data['data'] as List? ?? const []);
        return items.whereType<Map<String, dynamic>>().map(NutritionistModel.fromJson).toList();
      }

      throw AppError(response.data['error']?['message'] ?? 'Unable to load nutritionists');
    } catch (e) {
      throw mapError(e);
    }
  }

  /// GET /api/nutritionists/meal-plan-requests
  /// Fetches pending requests.
  Future<List<Map<String, dynamic>>> fetchMealPlanRequests() async {
    try {
      final response = await apiClient.get('/api/nutritionists/meal-plan-requests');

      if (response.statusCode == 200 && response.data['success'] == true) {
        final list = response.data['data'] as List? ?? const [];
        return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
      }

      throw AppError(
        response.data['error']?['message'] ?? 'Unable to fetch meal plan requests.',
      );
    } catch (e) {
      throw mapError(e);
    }
  }

  /// POST /api/nutritionists/meal-plan-requests/:id/respond
  /// Responds to a request.
  Future<bool> respondToMealPlanRequest(String requestId, String status) async {
    try {
      final response = await apiClient.post(
        '/api/nutritionists/meal-plan-requests/$requestId/respond',
        data: {'status': status},
      );

      return response.statusCode == 200 && response.data['success'] == true;
    } catch (e) {
      throw mapError(e);
    }
  }

  /// GET /api/nutritionists/profile/me
  /// Fetches the authenticated nutritionist's own profile.
  Future<Map<String, dynamic>?> fetchMyProfile() async {
    try {
      final response = await apiClient.get('/api/nutritionists/profile/me');

      if (response.statusCode == 200 && response.data['success'] == true) {
        if (response.data['data'] == null) return null;
        return Map<String, dynamic>.from(response.data['data'] as Map);
      }

      throw AppError(
        response.data['error']?['message'] ?? 'Unable to fetch nutritionist profile.',
      );
    } catch (e) {
      throw mapError(e);
    }
  }

  /// PUT /api/nutritionists/profile/me
  /// Updates the authenticated nutritionist's profile.
  Future<Map<String, dynamic>> updateProfile({
    required String professionalTitle,
    required String licenseNumber,
    required int serviceFee,
    required String fullName,
    required String specialization,
    File? certificateFile,
    String? certificateUrl,
  }) async {
    try {
      dynamic data;
      Map<String, dynamic>? headers;

      if (certificateFile != null) {
        data = FormData.fromMap({
          'professionalTitle': professionalTitle,
          'licenseNumber': licenseNumber,
          'serviceFee': serviceFee,
          'fullName': fullName,
          'specialization': specialization,
          'certificateFile': await MultipartFile.fromFile(
            certificateFile.path,
            filename: certificateFile.path.split('/').last,
          ),
        });
        headers = {'Content-Type': 'multipart/form-data'};
      } else {
        data = {
          'professionalTitle': professionalTitle,
          'licenseNumber': licenseNumber,
          'serviceFee': serviceFee,
          'fullName': fullName,
          'specialization': specialization,
          if (certificateUrl != null && certificateUrl.isNotEmpty)
            'certificateUrl': certificateUrl,
        };
      }

      final response = await apiClient.put(
        '/api/nutritionists/profile/me',
        data: data,
        headers: headers,
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        return Map<String, dynamic>.from(response.data['data'] as Map);
      }

      throw AppError(
        response.data['error']?['message'] ?? 'Failed to update nutritionist profile.',
      );
    } catch (e) {
      throw mapError(e);
    }
  }

  /// POST /api/meal-plans/generate
  /// Triggers AI meal plan generation pipeline for a given client.
  /// Returns the raw response map containing mealPlanId, status, and meta info.
  Future<Map<String, dynamic>> generateMealPlan(String clientId) async {
    try {
      final response = await apiClient.post(
        '/api/meal-plans/generate',
        data: {'clientId': clientId},
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        if (response.data['success'] == true || response.data['status'] != null) {
          return Map<String, dynamic>.from(response.data as Map);
        }
      }

      throw AppError(
        response.data['error']?['message'] ?? 'Failed to generate meal plan.',
      );
    } catch (e) {
      throw mapError(e);
    }
  }

  /// POST /api/meal-plans/generate-recipe-plan
  /// Triggers recipe-based weekly meal plan generation for a given client.
  /// Uses existing recipes from DB instead of AI-generated meals.
  Future<Map<String, dynamic>> generateRecipeBasedMealPlan(String clientId) async {
    try {
      final response = await apiClient.post(
        '/api/meal-plans/generate-recipe-plan',
        data: {'clientId': clientId},
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        if (response.data['success'] == true || response.data['status'] != null) {
          return Map<String, dynamic>.from(response.data as Map);
        }
      }

      throw AppError(
        response.data['error']?['message'] ?? 'Failed to generate recipe-based meal plan.',
      );
    } catch (e) {
      throw mapError(e);
    }
  }

  /// GET /api/meal-plans/:planId/draft
  /// Fetches a draft AI-generated meal plan.
  Future<Map<String, dynamic>> fetchDraftMealPlan(String planId) async {
    try {
      final response = await apiClient.get('/api/meal-plans/$planId/draft');

      if (response.statusCode == 200 && response.data['success'] == true) {
        return Map<String, dynamic>.from(response.data['data'] as Map);
      }

      throw AppError(
        response.data['error']?['message'] ?? 'Failed to fetch draft meal plan.',
      );
    } catch (e) {
      throw mapError(e);
    }
  }

  /// PUT /api/meal-plans/:planId/draft
  /// Updates a draft AI-generated meal plan.
  Future<Map<String, dynamic>> updateDraftMealPlan(String planId, Map<String, dynamic> payload) async {
    try {
      final response = await apiClient.put(
        '/api/meal-plans/$planId/draft',
        data: payload,
      );

      if (response.statusCode == 200) {
        if (response.data['success'] == true) {
          return Map<String, dynamic>.from(response.data['data'] as Map);
        }
      }

      throw AppError(
        response.data['error']?['message'] ?? 'Failed to update draft meal plan.',
      );
    } catch (e) {
      throw mapError(e);
    }
  }

  /// GET /api/meal-plans/nutritionist/plans
  /// Fetches all meal plans created by the authenticated nutritionist.
  Future<List<Map<String, dynamic>>> fetchNutritionistMealPlans() async {
    try {
      final response = await apiClient.get('/api/meal-plans/nutritionist/plans');

      if (response.statusCode == 200 && response.data['success'] == true) {
        final list = response.data['data'] as List? ?? const [];
        return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
      }

      throw AppError(
        response.data['error']?['message'] ?? 'Failed to fetch nutritionist meal plans.',
      );
    } catch (e) {
      throw mapError(e);
    }
  }

  /// PATCH /api/meal-plans/:planId/publish
  /// Publishes a draft meal plan.
  Future<bool> publishMealPlan(String planId) async {
    try {
      final response = await apiClient.patch('/api/meal-plans/$planId/publish');

      return response.statusCode == 200 && response.data['success'] == true;
    } catch (e) {
      throw mapError(e);
    }
  }

  /// GET /api/user/recipes — used by the recipe picker inside "Adjust Meal" bottom sheet.
  ///
  /// Supports:
  /// - [search]      text search against recipe name
  /// - [mealType]    optional filter: BREAKFAST | LUNCH | DINNER | SNACK
  /// - [minCalories] / [maxCalories] optional calorie range filter
  /// - [page] / [limit] for pagination (load-more)
  ///
  /// Returns `{ 'items': List, 'meta': Map }` so the caller can detect whether
  /// more pages are available via `meta['totalPages']`.
  Future<Map<String, dynamic>> searchRecipes({
    String search = '',
    String mealType = '',
    double? minCalories,
    double? maxCalories,
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final Map<String, dynamic> params = {
        'page': page,
        'limit': limit,
      };
      if (search.trim().isNotEmpty) params['search'] = search.trim();
      if (mealType.trim().isNotEmpty) params['mealType'] = mealType.trim().toUpperCase();
      if (minCalories != null) params['minCalories'] = minCalories;
      if (maxCalories != null) params['maxCalories'] = maxCalories;

      final response = await apiClient.get(
        '/api/user/recipes',
        queryParameters: params,
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        return {
          'items': (response.data['data'] as List? ?? []),
          'meta': (response.data['meta'] as Map<String, dynamic>? ?? {}),
        };
      }

      throw AppError(response.data['message'] ?? 'Unable to search recipes');
    } catch (e) {
      throw mapError(e);
    }
  }
}