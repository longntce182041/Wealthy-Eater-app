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

  Future<bool> updateMealItemWeight(
    String itemId, {
    double? weight,
    List<Map<String, dynamic>>? ingredients,
  }) async {
    errorMessage = null;
    notifyListeners();

    try {
      final Map<String, dynamic> requestData = {};
      if (weight != null) {
        requestData['weight'] = weight;
      }
      if (ingredients != null) {
        requestData['ingredients'] = ingredients;
      }

      final res = await _api.put(
        '/api/meal-plans/items/$itemId/weight',
        data: requestData,
      );

      if (res.statusCode == 200 && res.data['success'] == true) {
        final updatedData = res.data['data'] as Map<String, dynamic>;
        final index = items.indexWhere((element) => element['_id'] == itemId);
        if (index != -1) {
          items[index] = {
            ...(items[index] as Map<String, dynamic>),
            ...updatedData,
          };
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

  List<dynamic> loggedMeals = [];
  bool isLoadingLogs = false;
  String? logsError;

  Map<String, dynamic>? dailyMacroReport;
  bool isLoadingReport = false;
  String? reportError;

  Future<bool> logMealPlanItem(String itemId, {double? actualWeight}) async {
    errorMessage = null;
    notifyListeners();

    try {
      final Map<String, dynamic> requestData = {};
      if (actualWeight != null) {
        requestData['actual_weight_gram'] = actualWeight;
      }

      final res = await _api.post(
        '/api/meal-plans/items/$itemId/log',
        data: requestData,
      );

      if (res.statusCode == 200 || res.statusCode == 201) {
        return true;
      } else {
        errorMessage = res.data['error']?.toString() ?? 'Unable to log meal';
        notifyListeners();
        return false;
      }
    } catch (e) {
      errorMessage = e.toString().replaceFirst('Exception: ', '');
      notifyListeners();
      return false;
    }
  }

  Future<void> loadMealLogs({String? date}) async {
    isLoadingLogs = true;
    logsError = null;
    notifyListeners();

    try {
      final queryParams = date != null ? '?date=$date' : '';
      final res = await _api.get('/api/meal-plans/logs$queryParams');
      if (res.statusCode == 200 && res.data['success'] == true) {
        loggedMeals = res.data['data'] as List? ?? [];
      } else {
        logsError = res.data['error']?.toString() ?? 'Unable to load meal logs';
      }
    } catch (e) {
      logsError = e.toString().replaceFirst('Exception: ', '');
    } finally {
      isLoadingLogs = false;
      notifyListeners();
    }
  }

  Future<void> loadDailyMacroReport({String? date}) async {
    isLoadingReport = true;
    reportError = null;
    notifyListeners();

    try {
      final queryParams = date != null ? '?date=$date' : '';
      final res = await _api.get('/api/meal-plans/daily-report$queryParams');
      if (res.statusCode == 200 && res.data['success'] == true) {
        dailyMacroReport = res.data['data'] as Map<String, dynamic>?;
      } else {
        reportError = res.data['error']?.toString() ?? 'Unable to load macro report';
      }
    } catch (e) {
      reportError = e.toString().replaceFirst('Exception: ', '');
    } finally {
      isLoadingReport = false;
      notifyListeners();
    }
  }

  Future<bool> updateMealLog(String logId, {required double weight, String? date}) async {
    errorMessage = null;
    notifyListeners();

    try {
      final Map<String, dynamic> requestData = {
        'actual_weight_gram': weight,
      };
      if (date != null) {
        requestData['date'] = date;
      }

      final res = await _api.put(
        '/api/meal-plans/logs/$logId',
        data: requestData,
      );

      if (res.statusCode == 200 && res.data['success'] == true) {
        return true;
      } else {
        errorMessage = res.data['error']?.toString() ?? 'Unable to update meal log';
        notifyListeners();
        return false;
      }
    } catch (e) {
      errorMessage = e.toString().replaceFirst('Exception: ', '');
      notifyListeners();
      return false;
    }
  }

  Future<bool> deleteMealLog(String logId) async {
    errorMessage = null;
    notifyListeners();

    try {
      final res = await _api.delete('/api/meal-plans/logs/$logId');
      if (res.statusCode == 200 && res.data['success'] == true) {
        return true;
      } else {
        errorMessage = res.data['error']?.toString() ?? 'Unable to delete meal log';
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
