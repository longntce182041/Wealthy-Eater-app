import 'dart:io';

import '../../domain/repositories/nutritionist_repository.dart';
import '../../models/account_creation_response_dto.dart';
import '../../models/registration_response_dto.dart';
import '../services/nutritionist_remote_datasource.dart';

/// Implementation of NutritionistRepository using remote data source
class NutritionistRepositoryImpl implements NutritionistRepository {
  final NutritionistRemoteDataSource _remoteDataSource;

  NutritionistRepositoryImpl(this._remoteDataSource);

  @override
  Future<AccountCreationResponseDto> createAccountWithEmailPassword({
    required String email,
    required String password,
  }) async {
    return _remoteDataSource.createAccountWithEmailPassword(
      email: email,
      password: password,
    );
  }

  @override
  Future<RegistrationResponseDto> registerAsNutritionist({
    required String professionalTitle,
    required String licenseNumber,
    required int serviceFee,
    File? certificateFile,
    String? certificateUrl,
    String? accessToken,
  }) async {
    return _remoteDataSource.registerAsNutritionist(
      professionalTitle: professionalTitle,
      licenseNumber: licenseNumber,
      serviceFee: serviceFee,
      certificateFile: certificateFile,
      certificateUrl: certificateUrl,
      accessToken: accessToken,
    );
  }
}
