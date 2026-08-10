/// meal_image_scan_service.dart — HTTP service for the Camera Meal Scanning API.
library;

import 'package:dio/dio.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/error/app_error.dart';
import '../../core/network/api_client.dart';
import '../models/meal_image_scan_model.dart';

class MealImageScanService {
  final ApiClient _apiClient;

  const MealImageScanService({required ApiClient apiClient}) : _apiClient = apiClient;

  /// Uploads a meal image file and returns the estimated ingredients and macro-nutrition analysis.
  ///
  /// Throws [AppError] on failures.
  Future<MealImageScanResult> scanMealImage({required XFile file}) async {
    try {
      final fileName = file.name;
      final bytes = await file.readAsBytes();

      final formData = FormData.fromMap({
        'image': MultipartFile.fromBytes(
          bytes,
          filename: fileName,
        ),
      });

      final response = await _apiClient.post(
        '/api/meal-plan/scan-meal',
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        final data = response.data['data'] as Map<String, dynamic>;
        return MealImageScanResult.fromJson(data);
      }

      throw AppError(
        response.data['error']?['message'] ?? 'Unable to analyze the meal image.',
      );
    } catch (e) {
      throw mapError(e);
    }
  }

  /// Logs a system-matched recipe to the user's meal log.
  Future<void> logCustomRecipe({required String recipeId, required double weightGram}) async {
    try {
      final response = await _apiClient.post(
        '/api/meal-plan/logs/custom',
        data: {
          'recipeId': recipeId,
          'actual_weight_gram': weightGram,
        },
      );

      if (response.statusCode == 201 && response.data['success'] == true) {
        return;
      }

      throw AppError(
        response.data['error']?['message'] ?? 'Failed to log recipe.',
      );
    } catch (e) {
      throw mapError(e);
    }
  }
}
