import '../../domain/entities/consultation.dart';
import '../../domain/repositories/nutritionist_repository.dart';
import '../services/nutritionist_service.dart';

class NutritionistRepositoryImpl implements NutritionistRepository {
  final NutritionistService service;

  NutritionistRepositoryImpl({required this.service});

  @override
  Future<List<NutritionistEntity>> fetchNutritionists() {
    return service.fetchNutritionists();
  }

  @override
  Future<List<Map<String, dynamic>>> fetchMealPlanRequests() {
    return service.fetchMealPlanRequests();
  }

  @override
  Future<bool> respondToMealPlanRequest(String requestId, String status) {
    return service.respondToMealPlanRequest(requestId, status);
  }
}
