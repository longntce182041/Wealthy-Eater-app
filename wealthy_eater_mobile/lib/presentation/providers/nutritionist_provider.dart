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
    notifyListeners();
  }
}
