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
}
