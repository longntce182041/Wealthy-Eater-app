import 'dart:io';

import 'package:dio/dio.dart';

import '../../../../core/error/app_error.dart';
import '../../../../core/network/api_client.dart';
import '../../models/account_creation_response_dto.dart';
import '../../models/registration_response_dto.dart';

/// Remote data source using Dio for nutritionist registration API calls
class NutritionistRemoteDataSource {
  final ApiClient _apiClient;

  NutritionistRemoteDataSource(this._apiClient);

  /// API: POST /api/nutritionists/register-account
  /// Step 1: Create a new user account with email and password
  /// Returns tokens and userId for use in Step 2
  Future<AccountCreationResponseDto> createAccountWithEmailPassword({
    required String email,
    required String password,
  }) async {
    try {
      final response = await _apiClient.post<Map<String, dynamic>>(
        '/api/nutritionists/register-account',
        data: {'email': email, 'password': password},
      );

      if (response.statusCode == 201 && response.data != null) {
        return AccountCreationResponseDto.fromJson(response.data!);
      }

      throw AppError('Failed to create account: ${response.statusCode}');
    } on DioException catch (e) {
      throw mapError(e);
    }
  }

  /// API: POST /api/nutritionists/register
  /// Step 2: Register as nutritionist (authenticated)
  /// Supports multipart file upload OR JSON with certificate URL
  ///
  /// If [certificateFile] is provided: sends as multipart/form-data
  /// If [certificateUrl] is provided: sends as JSON with URL
  /// [accessToken] is passed explicitly to ensure authentication
  Future<RegistrationResponseDto> registerAsNutritionist({
    required String professionalTitle,
    required String licenseNumber,
    required int serviceFee,
    File? certificateFile,
    String? certificateUrl,
    String? accessToken,
  }) async {
    try {
      // Route 1: File upload (multipart)
      if (certificateFile != null) {
        return await _registerWithFile(
          professionalTitle: professionalTitle,
          licenseNumber: licenseNumber,
          serviceFee: serviceFee,
          certificateFile: certificateFile,
          accessToken: accessToken,
        );
      }

      // Route 2: Certificate URL (JSON)
      if (certificateUrl != null && certificateUrl.isNotEmpty) {
        return await _registerWithUrl(
          professionalTitle: professionalTitle,
          licenseNumber: licenseNumber,
          serviceFee: serviceFee,
          certificateUrl: certificateUrl,
          accessToken: accessToken,
        );
      }

      throw AppError('Certificate file or URL is required');
    } on DioException catch (e) {
      throw mapError(e);
    }
  }

  /// Register with multipart file upload
  Future<RegistrationResponseDto> _registerWithFile({
    required String professionalTitle,
    required String licenseNumber,
    required int serviceFee,
    required File certificateFile,
    String? accessToken,
  }) async {
    final formData = FormData.fromMap({
      'professionalTitle': professionalTitle,
      'licenseNumber': licenseNumber,
      'serviceFee': serviceFee,
      'certificateFile': await MultipartFile.fromFile(
        certificateFile.path,
        filename: certificateFile.path.split('/').last,
      ),
    });

    final headers = <String, dynamic>{};
    if (accessToken != null && accessToken.isNotEmpty) {
      headers['Authorization'] = 'Bearer $accessToken';
    }

    final response = await _apiClient.dio.post<Map<String, dynamic>>(
      '/api/nutritionists/register',
      data: formData,
      options: Options(
        contentType: 'multipart/form-data',
        headers: headers.isNotEmpty ? headers : null,
      ),
    );

    if (response.statusCode == 201 && response.data != null) {
      return RegistrationResponseDto.fromJson(response.data!);
    }

    throw AppError(
      'Failed to register as nutritionist: ${response.statusCode}',
    );
  }

  /// Register with certificate URL (JSON payload)
  Future<RegistrationResponseDto> _registerWithUrl({
    required String professionalTitle,
    required String licenseNumber,
    required int serviceFee,
    required String certificateUrl,
    String? accessToken,
  }) async {
    final headers = <String, dynamic>{};
    if (accessToken != null && accessToken.isNotEmpty) {
      headers['Authorization'] = 'Bearer $accessToken';
    }

    final response = await _apiClient.post<Map<String, dynamic>>(
      '/api/nutritionists/register',
      data: {
        'professionalTitle': professionalTitle,
        'licenseNumber': licenseNumber,
        'serviceFee': serviceFee,
        'certificateUrl': certificateUrl,
      },
      headers: headers.isNotEmpty ? headers : null,
    );

    if (response.statusCode == 201 && response.data != null) {
      return RegistrationResponseDto.fromJson(response.data!);
    }

    throw AppError(
      'Failed to register as nutritionist: ${response.statusCode}',
    );
  }
}
