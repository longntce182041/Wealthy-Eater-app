import 'package:dio/dio.dart';
import '../models/meal_plan_generation_dto.dart';

class PlanRepository {
  final Dio _dioClient;

  PlanRepository(this._dioClient);

  Future<MealPlanGenerationResponse> requestPlanGeneration(
    String targetClientId,
    String activeToken,
  ) async {
    try {
      final response = await _dioClient.post(
        '/meal-plans/generate',
        data: {'clientId': targetClientId},
        options: Options(
          headers: {'Authorization': 'Bearer $activeToken'},
          contentType: Headers.jsonContentType,
        ),
      );
      return MealPlanGenerationResponse.fromJson(response.data);
    } on DioException catch (e) {
      final runtimeMessage =
          e.response?.data['error'] ??
          'Execution connection breakdown exception event.';
      throw Exception(runtimeMessage);
    }
  }
}
