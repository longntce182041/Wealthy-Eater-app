import '../entities/consultation.dart';
import '../repositories/nutritionist_repository.dart';

class FetchNutritionistsUseCase {
  final NutritionistRepository repository;
  FetchNutritionistsUseCase(this.repository);
  Future<List<NutritionistEntity>> call() => repository.fetchNutritionists();
}

class FetchMealPlanRequestsUseCase {
  final NutritionistRepository repository;
  FetchMealPlanRequestsUseCase(this.repository);
  Future<List<Map<String, dynamic>>> call() => repository.fetchMealPlanRequests();
}

class RespondToMealPlanRequestUseCase {
  final NutritionistRepository repository;
  RespondToMealPlanRequestUseCase(this.repository);
  Future<bool> call(String requestId, String status) =>
      repository.respondToMealPlanRequest(requestId, status);
}
