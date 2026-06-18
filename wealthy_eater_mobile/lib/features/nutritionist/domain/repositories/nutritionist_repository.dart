import 'dart:io';

import '../../models/account_creation_response_dto.dart';
import '../../models/registration_response_dto.dart';

/// Domain repository interface for nutritionist registration
/// Defines the contract for account creation and nutritionist registration
abstract class NutritionistRepository {
  /// Step 1: Create a new user account with email and password
  /// Returns account details with JWT tokens
  Future<AccountCreationResponseDto> createAccountWithEmailPassword({
    required String email,
    required String password,
  });

  /// Step 2: Register as a nutritionist with professional details
  /// Supports either file upload OR certificate URL
  /// - [certificateFile]: Optional file (PDF/JPG/PNG) to upload
  /// - [certificateUrl]: Optional URL string for certificate
  /// - [accessToken]: Optional JWT token from Step 1 account creation
  /// At least one of them must be provided
  Future<RegistrationResponseDto> registerAsNutritionist({
    required String professionalTitle,
    required String licenseNumber,
    required int serviceFee,
    File? certificateFile,
    String? certificateUrl,
    String? accessToken,
  });
}
