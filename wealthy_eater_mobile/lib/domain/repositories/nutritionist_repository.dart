import '../entities/consultation.dart';

abstract class NutritionistRepository {
  Future<List<NutritionistEntity>> fetchNutritionists();
  Future<List<Map<String, dynamic>>> fetchMealPlanRequests();
  Future<bool> respondToMealPlanRequest(String requestId, String status);
}
