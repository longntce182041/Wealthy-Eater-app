import 'dart:io';
import 'package:flutter/foundation.dart';
import '../../core/network/api_client.dart';
import '../../data/models/nutritionist_model.dart';
import '../../data/services/nutritionist_service.dart';

class NutritionistProvider extends ChangeNotifier {
  final NutritionistService _service;

  NutritionistProvider({required ApiClient api})
      : _service = NutritionistService(apiClient: api);

  List<NutritionistModel> _nutritionists = [];
  bool _isLoading = false;
  String? _error;

  List<NutritionistModel> get nutritionists => _nutritionists;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> fetchNutritionists() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _nutritionists = await _service.fetchNutritionists();
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
      _mealPlanRequests = await _service.fetchMealPlanRequests();
    } catch (e) {
      _requestsError = e.toString().replaceFirst('Exception: ', '');
    } finally {
      _isLoadingRequests = false;
      notifyListeners();
    }
  }

  Future<bool> respondToRequest(String requestId, String status) async {
    try {
      final success = await _service.respondToMealPlanRequest(requestId, status);
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

  // ── Nutritionist My Profile ───────────────────────────────────────────────
  Map<String, dynamic>? _myProfile;
  bool _isLoadingProfile = false;
  String? _profileError;

  Map<String, dynamic>? get myProfile => _myProfile;
  bool get isLoadingProfile => _isLoadingProfile;
  String? get profileError => _profileError;

  Future<void> fetchMyProfile() async {
    _isLoadingProfile = true;
    _profileError = null;
    notifyListeners();

    try {
      _myProfile = await _service.fetchMyProfile();
    } catch (e) {
      _profileError = e.toString().replaceFirst('Exception: ', '');
    } finally {
      _isLoadingProfile = false;
      notifyListeners();
    }
  }

  Future<bool> updateMyProfile({
    required String professionalTitle,
    required String licenseNumber,
    required int serviceFee,
    required String fullName,
    required String specialization,
    File? certificateFile,
    String? certificateUrl,
  }) async {
    _isLoadingProfile = true;
    _profileError = null;
    notifyListeners();

    try {
      final updated = await _service.updateProfile(
        professionalTitle: professionalTitle,
        licenseNumber: licenseNumber,
        serviceFee: serviceFee,
        fullName: fullName,
        specialization: specialization,
        certificateFile: certificateFile,
        certificateUrl: certificateUrl,
      );
      _myProfile = updated;
      return true;
    } catch (e) {
      _profileError = e.toString().replaceFirst('Exception: ', '');
      return false;
    } finally {
      _isLoadingProfile = false;
      notifyListeners();
    }
  }

  /// Clears all user-specific state on logout to prevent data leakage
  /// between different accounts.
  void reset() {
    _nutritionists = [];
    _isLoading = false;
    _error = null;
    _mealPlanRequests = [];
    _isLoadingRequests = false;
    _requestsError = null;
    _myProfile = null;
    _isLoadingProfile = false;
    _profileError = null;
    _isGenerating = false;
    _generationError = null;
    _generationResult = null;
    _nutritionistPlans = [];
    _isLoadingPlans = false;
    _loadPlansError = null;
    notifyListeners();
  }

  // ── UC-39: AI Meal Plan Generation ──────────────────────────────────────────
  bool _isGenerating = false;
  String? _generationError;
  Map<String, dynamic>? _generationResult;

  bool get isGenerating => _isGenerating;
  String? get generationError => _generationError;
  Map<String, dynamic>? get generationResult => _generationResult;

  /// POST /api/meal-plans/generate
  /// Sends clientId to backend which triggers the full n8n → FastAPI → Gemini pipeline.
  Future<void> generateMealPlan(String clientId) async {
    _isGenerating = true;
    _generationError = null;
    _generationResult = null;
    notifyListeners();

    try {
      final result = await _service.generateMealPlan(clientId);
      _generationResult = result;
    } catch (e) {
      _generationError = e.toString().replaceFirst('Exception: ', '');
    } finally {
      _isGenerating = false;
      notifyListeners();
    }
  }

  /// Resets only the meal generation state (for re-running generation on same screen).
  void resetGeneration() {
    _isGenerating = false;
    _generationError = null;
    _generationResult = null;
    notifyListeners();
  }

  /// POST /api/meal-plans/generate-recipe-plan
  /// Generates a recipe-based weekly meal plan using existing recipes from DB.
  Future<void> generateRecipePlan(String clientId) async {
    _isGenerating = true;
    _generationError = null;
    _generationResult = null;
    notifyListeners();

    try {
      final result = await _service.generateRecipeBasedMealPlan(clientId);
      _generationResult = result;
    } catch (e) {
      _generationError = e.toString().replaceFirst('Exception: ', '');
    } finally {
      _isGenerating = false;
      notifyListeners();
    }
  }

  // ── UC-52: Edit Draft Meal Plan ──────────────────────────────────────────────
  bool _isLoadingDraft = false;
  String? _loadDraftError;
  Map<String, dynamic>? _draftMealPlan;

  bool get isLoadingDraft => _isLoadingDraft;
  String? get loadDraftError => _loadDraftError;
  Map<String, dynamic>? get draftMealPlan => _draftMealPlan;

  Future<void> fetchDraftMealPlan(String planId) async {
    _isLoadingDraft = true;
    _loadDraftError = null;
    notifyListeners();

    try {
      final result = await _service.fetchDraftMealPlan(planId);
      _draftMealPlan = result;
    } catch (e) {
      _loadDraftError = e.toString().replaceFirst('Exception: ', '');
    } finally {
      _isLoadingDraft = false;
      notifyListeners();
    }
  }

  bool _isUpdatingDraft = false;
  String? _updateDraftError;

  bool get isUpdatingDraft => _isUpdatingDraft;
  String? get updateDraftError => _updateDraftError;

  Future<bool> updateDraftMealPlan(String planId, Map<String, dynamic> payload) async {
    _isUpdatingDraft = true;
    _updateDraftError = null;
    notifyListeners();

    try {
      await _service.updateDraftMealPlan(planId, payload);
      return true;
    } catch (e) {
      _updateDraftError = e.toString().replaceFirst('Exception: ', '');
      return false;
    } finally {
      _isUpdatingDraft = false;
      notifyListeners();
    }
  }

  // ── Nutritionist Meal Plans Management ──────────────────────────────────────
  List<Map<String, dynamic>> _nutritionistPlans = [];
  bool _isLoadingPlans = false;
  String? _loadPlansError;

  List<Map<String, dynamic>> get nutritionistPlans => _nutritionistPlans;
  bool get isLoadingPlans => _isLoadingPlans;
  String? get loadPlansError => _loadPlansError;

  Future<void> loadNutritionistMealPlans() async {
    _isLoadingPlans = true;
    _loadPlansError = null;
    notifyListeners();

    try {
      _nutritionistPlans = await _service.fetchNutritionistMealPlans();
    } catch (e) {
      _loadPlansError = e.toString().replaceFirst('Exception: ', '');
    } finally {
      _isLoadingPlans = false;
      notifyListeners();
    }
  }

  Future<bool> publishPlan(String planId) async {
    try {
      final success = await _service.publishMealPlan(planId);
      if (success) {
        // Update the local list to show as published
        final index = _nutritionistPlans.indexWhere((p) => p['mealPlanId'] == planId);
        if (index != -1) {
          _nutritionistPlans[index]['status'] = 'PUBLISHED';
          notifyListeners();
        }
      }
      return success;
    } catch (e) {
      debugPrint('Failed to publish meal plan: $e');
      return false;
    }
  }

  // ── UC-52: Recipe Search for Adjust Meal picker ──────────────────────────────
  List<Map<String, dynamic>> _recipeSearchResults = [];
  bool _isSearchingRecipes = false;
  String? _recipeSearchError;
  bool _hasMoreRecipes = false;
  int _recipeSearchPage = 1;

  List<Map<String, dynamic>> get recipeSearchResults => _recipeSearchResults;
  bool get isSearchingRecipes => _isSearchingRecipes;
  String? get recipeSearchError => _recipeSearchError;
  bool get hasMoreRecipes => _hasMoreRecipes;

  /// Search recipes for the recipe picker inside the "Adjust Meal" bottom sheet.
  ///
  /// - [reset=true]  → first search / new query (clears previous results & resets page to 1)
  /// - [reset=false] → load-more (appends results, increments page)
  Future<void> searchRecipesForSwap({
    String query = '',
    String mealType = '',
    double? minCalories,
    double? maxCalories,
    bool reset = true,
  }) async {
    if (reset) {
      _recipeSearchResults = [];
      _recipeSearchPage = 1;
      _hasMoreRecipes = false;
    }

    _isSearchingRecipes = true;
    _recipeSearchError = null;
    notifyListeners();

    try {
      const int pageSize = 20;
      final result = await _service.searchRecipes(
        search: query,
        mealType: mealType,
        minCalories: minCalories,
        maxCalories: maxCalories,
        page: _recipeSearchPage,
        limit: pageSize,
      );

      final items = (result['items'] as List)
          .whereType<Map<String, dynamic>>()
          .toList();
      final meta = result['meta'] as Map<String, dynamic>? ?? {};
      final totalPages = (meta['totalPages'] as num?)?.toInt() ?? 1;

      if (reset) {
        _recipeSearchResults = items;
      } else {
        _recipeSearchResults = [..._recipeSearchResults, ...items];
      }

      _hasMoreRecipes = _recipeSearchPage < totalPages;
      if (!reset) _recipeSearchPage++;
    } catch (e) {
      _recipeSearchError = e.toString().replaceFirst('Exception: ', '');
    } finally {
      _isSearchingRecipes = false;
      notifyListeners();
    }
  }

  /// Load next page of recipe search results (called on scroll-to-end).
  Future<void> loadMoreRecipes({
    String query = '',
    String mealType = '',
  }) async {
    if (!_hasMoreRecipes || _isSearchingRecipes) return;
    _recipeSearchPage++;
    await searchRecipesForSwap(
      query: query,
      mealType: mealType,
      reset: false,
    );
  }

  /// Clear recipe search state when bottom sheet closes.
  void clearRecipeSearch() {
    _recipeSearchResults = [];
    _isSearchingRecipes = false;
    _recipeSearchError = null;
    _hasMoreRecipes = false;
    _recipeSearchPage = 1;
    notifyListeners();
  }
}
