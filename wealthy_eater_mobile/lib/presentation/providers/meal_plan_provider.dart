import 'package:flutter/foundation.dart';
import '../../core/network/api_client.dart';

enum MealPlanState { initial, loading, success, error }

class MealPlanProvider extends ChangeNotifier {
  final ApiClient _api;

  MealPlanProvider({required ApiClient api}) : _api = api;

  MealPlanState state = MealPlanState.initial;
  String? errorMessage;
  Map<String, dynamic>? mealPlan;
  List<dynamic> items = [];

  Future<void> loadMyMealPlan() async {
    state = MealPlanState.loading;
    errorMessage = null;
    notifyListeners();

    try {
      final res = await _api.get('/api/meal-plans/my-plan');
      if (res.statusCode == 200 && res.data['success'] == true) {
        if (res.data['data'] != null) {
          mealPlan = res.data['data'] as Map<String, dynamic>;
          items = mealPlan?['items'] as List? ?? [];
        } else {
          mealPlan = null;
          items = [];
        }
        state = MealPlanState.success;
      } else {
        errorMessage = res.data['error']?.toString() ?? 'Unable to fetch meal plan';
        state = MealPlanState.error;
      }
    } catch (e) {
      errorMessage = e.toString().replaceFirst('Exception: ', '');
      state = MealPlanState.error;
    }
    notifyListeners();
  }

  Future<bool> updateMealItemWeight(String itemId, double weight) async {
    errorMessage = null;
    notifyListeners();

    try {
      final res = await _api.put(
        '/api/meal-plans/items/$itemId/weight',
        data: {'weight': weight},
      );

      if (res.statusCode == 200 && res.data['success'] == true) {
        final updatedData = res.data['data'] as Map<String, dynamic>;
        final index = items.indexWhere((element) => element['_id'] == itemId);
        if (index != -1) {
          items[index] = updatedData;
          notifyListeners();
        }
        return true;
      } else {
        errorMessage = res.data['error']?.toString() ?? 'Unable to update portion size';
        notifyListeners();
        return false;
      }
    } catch (e) {
      errorMessage = e.toString().replaceFirst('Exception: ', '');
      notifyListeners();
      return false;
    }
  }

  void reset() {
    state = MealPlanState.initial;
    errorMessage = null;
    mealPlan = null;
    items = [];
    notifyListeners();
  }
}
