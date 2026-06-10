import 'package:dio/dio.dart';

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

      throw Exception(response.data['error']?['message'] ?? 'Unable to load nutritionists');
    } on DioException catch (e) {
      throw Exception(e.response?.data?['error']?['message'] ?? e.message ?? 'Unable to load nutritionists');
    }
  }
}
