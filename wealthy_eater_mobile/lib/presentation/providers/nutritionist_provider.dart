import 'package:flutter/foundation.dart';

import '../../domain/entities/consultation.dart';
import '../../domain/usecases/nutritionist_usecases.dart';

class NutritionistProvider extends ChangeNotifier {
  final FetchNutritionistsUseCase fetchNutritionistsUseCase;
  final FetchMealPlanRequestsUseCase fetchMealPlanRequestsUseCase;
  final RespondToMealPlanRequestUseCase respondToMealPlanRequestUseCase;

  NutritionistProvider({
    required this.fetchNutritionistsUseCase,
    required this.fetchMealPlanRequestsUseCase,
    required this.respondToMealPlanRequestUseCase,
  });

  List<NutritionistEntity> _nutritionists = [];
  bool _isLoading = false;
  String? _error;

  List<NutritionistEntity> get nutritionists => _nutritionists;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> fetchNutritionists() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _nutritionists = await fetchNutritionistsUseCase();
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // ── Meal Plan Requests for Nutritionist ────────────────────────────────────
  List<Map<String, dynamic>> _mealPlanRequests = [];
  bool _isLoadingRequests = false;
  String? _requestsError;

  List<Map<String, dynamic>> get mealPlanRequests => _mealPlanRequests;
  bool get isLoadingRequests => _isLoadingRequests;
  String? get requestsError => _requestsError;

  Future<void> loadMealPlanRequests() async {
    _isLoadingRequests = true;
    _requestsError = null;
    notifyListeners();

    try {
      _mealPlanRequests = await fetchMealPlanRequestsUseCase();
    } catch (e) {
      _requestsError = e.toString().replaceFirst('Exception: ', '');
    } finally {
      _isLoadingRequests = false;
      notifyListeners();
    }
  }

  Future<bool> respondToRequest(String requestId, String status) async {
    try {
      final success = await respondToMealPlanRequestUseCase(requestId, status);
      if (success) {
        // Remove from local list to refresh UI instantly
        _mealPlanRequests.removeWhere((r) => r['_id'] == requestId);
        notifyListeners();
      }
      return success;
    } catch (e) {
      debugPrint('Failed to respond to meal plan request: $e');
      return false;
    }
  }
}
