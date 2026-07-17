/// pantry_service.dart — HTTP service for the Virtual Pantry API.

import 'package:dio/dio.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/error/app_error.dart';
import '../../core/network/api_client.dart';
import '../models/pantry_model.dart';

class PantryService {
  final ApiClient _apiClient;

  const PantryService({required ApiClient apiClient}) : _apiClient = apiClient;

  /// Fetch the current list of pantry ingredients from the server.
  Future<List<PantryIngredient>> getPantry() async {
    try {
      final response = await _apiClient.get('/api/pantry');

      if (response.statusCode == 200 && response.data['success'] == true) {
        final data = response.data['data'];
        if (data != null && data['pantry_ingredients'] != null) {
          final list = data['pantry_ingredients'] as List;
          return list.map((item) => PantryIngredient.fromJson(item)).toList();
        }
        return [];
      }

      throw AppError(
        response.data['error']?['message'] ?? 'Failed to load virtual fridge.',
      );
    } catch (e) {
      throw mapError(e);
    }
  }

  /// Manually update/sync the list of pantry ingredients.
  Future<List<PantryIngredient>> updatePantryManual(List<PantryIngredient> ingredients) async {
    try {
      final payload = {
        'ingredients': ingredients.map((item) => item.toJson()).toList(),
      };

      final response = await _apiClient.post(
        '/api/pantry/manual',
        data: payload,
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        final data = response.data['data'];
        if (data != null && data['pantry_ingredients'] != null) {
          final list = data['pantry_ingredients'] as List;
          return list.map((item) => PantryIngredient.fromJson(item)).toList();
        }
        return [];
      }

      throw AppError(
        response.data['error']?['message'] ?? 'Failed to update virtual fridge.',
      );
    } catch (e) {
      throw mapError(e);
    }
  }

  /// Uploads a pantry snapshot image to scan for ingredients.
  Future<List<PantryIngredient>> scanPantryImage(XFile file) async {
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
        '/api/pantry/scan',
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        final list = response.data['data'] as List;
        return list.map((item) => PantryIngredient.fromJson(item)).toList();
      }

      throw AppError(
        response.data['error']?['message'] ?? 'Failed to scan pantry image.',
      );
    } catch (e) {
      throw mapError(e);
    }
  }
}
