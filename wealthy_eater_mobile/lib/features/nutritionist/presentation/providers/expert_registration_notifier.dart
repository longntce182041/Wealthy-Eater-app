import 'dart:io';

import 'package:flutter/foundation.dart';

import '../../domain/repositories/nutritionist_repository.dart';
import 'expert_registration_state.dart';

/// StateNotifier for managing expert registration flow
/// Handles both Step 1 (account creation) and Step 2 (nutritionist registration)
class ExpertRegistrationNotifier extends ChangeNotifier {
  final NutritionistRepository _repository;
  ExpertRegistrationState _state = RegistrationInitial();

  ExpertRegistrationNotifier(this._repository);

  ExpertRegistrationState get state => _state;

  /// Step 1: Create account with email and password
  Future<void> createAccount({
    required String email,
    required String password,
  }) async {
    _state = AccountCreationLoading();
    notifyListeners();

    try {
      final response = await _repository.createAccountWithEmailPassword(
        email: email,
        password: password,
      );

      _state = AccountCreationSuccess(
        userId: response.data.userId,
        accessToken: response.data.accessToken,
        refreshToken: response.data.refreshToken,
        email: response.data.email,
      );
    } catch (e) {
      _state = AccountCreationError(e.toString());
    }

    notifyListeners();
  }

  /// Step 2: Register as nutritionist with professional details
  /// Supports both file upload and certificate URL
  Future<void> registerAsNutritionist({
    required String professionalTitle,
    required String licenseNumber,
    required int serviceFee,
    File? certificateFile,
    String? certificateUrl,
    String? accessToken,
  }) async {
    _state = NutritionistRegistrationLoading();
    notifyListeners();

    try {
      // Call repository with all parameters
      final response = await _repository.registerAsNutritionist(
        professionalTitle: professionalTitle,
        licenseNumber: licenseNumber,
        serviceFee: serviceFee,
        certificateFile: certificateFile,
        certificateUrl: certificateUrl,
        accessToken: accessToken,
      );

      _state = NutritionistRegistrationSuccess(
        nutritionistId: response.data?.nutritionistId ?? '',
        approvalStatus: response.data?.approvalStatus ?? 'PENDING',
      );
    } catch (e) {
      _state = NutritionistRegistrationError(_extractErrorMessage(e));
    }

    notifyListeners();
  }

  /// Reset to initial state
  void reset() {
    _state = RegistrationInitial();
    notifyListeners();
  }

  String _extractErrorMessage(Object error) {
    if (error is String) {
      return error;
    }
    return 'An error occurred';
  }
}
