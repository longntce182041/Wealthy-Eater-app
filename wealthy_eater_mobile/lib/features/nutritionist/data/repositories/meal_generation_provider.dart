import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../../data/models/meal_plan_generation_dto.dart';
import '../../data/repositories/plan_repository.dart';

// Base Network Injection Provider Layer Config Anchor
final dioClientProvider = Provider<Dio>((ref) => Dio(BaseOptions(baseUrl: 'http://localhost:5000/api/v1')));
final planRepositoryProvider = Provider<PlanRepository>((ref) => PlanRepository(ref.read(dioClientProvider)));

class MealGenerationStateNotifier extends StateNotifier<AsyncValue<MealPlanGenerationResponse?>> {
  final PlanRepository _repository;

  MealGenerationStateNotifier(this._repository) : super(const AsyncValue.data(null));

  Future<void> executePipeline(String clientId, String sessionToken) async {
    state = const AsyncValue.loading();
    try {
      final outcome = await _repository.requestPlanGeneration(clientId, sessionToken);
      state = AsyncValue.data(outcome);
    } catch (err, stack) {
      state = AsyncValue.error(err, stack);
    }
  }
}

final mealGenerationProvider = StateNotifierProvider<MealGenerationStateNotifier, AsyncValue<MealPlanGenerationResponse?>>((ref) {
  return MealGenerationStateNotifier(ref.read(planRepositoryProvider));
});