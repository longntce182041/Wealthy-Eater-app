import 'package:flutter/foundation.dart';
import '../../data/models/meal_plan_generation_dto.dart';
import '../../data/repositories/plan_repository.dart';

enum MealGenerationState { initial, loading, success, error }

class MealGenerationProvider extends ChangeNotifier {
  final PlanRepository _repository;

  MealGenerationProvider({required PlanRepository repository})
      : _repository = repository;

  MealGenerationState state = MealGenerationState.initial;
  String? errorMessage;
  MealPlanGenerationResponse? generationResult;

  Future<void> executePipeline(String clientId, String sessionToken) async {
    state = MealGenerationState.loading;
    errorMessage = null;
    generationResult = null;
    notifyListeners();

    try {
      final outcome = await _repository.requestPlanGeneration(
        clientId,
        sessionToken,
      );
      generationResult = outcome;
      state = MealGenerationState.success;
    } catch (err) {
      errorMessage = err.toString().replaceFirst('Exception: ', '');
      state = MealGenerationState.error;
    }
    notifyListeners();
  }

  void reset() {
    state = MealGenerationState.initial;
    errorMessage = null;
    generationResult = null;
    notifyListeners();
  }
}
