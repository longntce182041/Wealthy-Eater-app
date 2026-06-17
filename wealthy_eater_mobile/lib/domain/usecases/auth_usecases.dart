import '../entities/user.dart';
import '../repositories/auth_repository.dart';

class RestoreSessionUseCase {
  final AuthRepository repository;
  RestoreSessionUseCase(this.repository);
  Future<UserEntity?> call() => repository.restoreSession();
}

class LoginUseCase {
  final AuthRepository repository;
  LoginUseCase(this.repository);
  Future<UserEntity> call(String email, String password, {String? role}) =>
      repository.login(email, password, role: role);
}

class GoogleSignInUseCase {
  final AuthRepository repository;
  GoogleSignInUseCase(this.repository);
  Future<UserEntity> call() => repository.googleSignIn();
}

class RegisterUseCase {
  final AuthRepository repository;
  RegisterUseCase(this.repository);
  Future<void> call(String email, String password, String confirmPassword) =>
      repository.register(email, password, confirmPassword);
}

class VerifyOtpUseCase {
  final AuthRepository repository;
  VerifyOtpUseCase(this.repository);
  Future<UserEntity?> call(String email, String otp) =>
      repository.verifyOtp(email, otp);
}

class ResendOtpUseCase {
  final AuthRepository repository;
  ResendOtpUseCase(this.repository);
  Future<void> call(String email) => repository.resendOtp(email);
}

class LogoutUseCase {
  final AuthRepository repository;
  LogoutUseCase(this.repository);
  Future<void> call() => repository.logout();
}

class FetchUserProfileUseCase {
  final AuthRepository repository;
  FetchUserProfileUseCase(this.repository);
  Future<Map<String, dynamic>?> call() => repository.fetchUserProfile();
}

class FetchSetupMetadataUseCase {
  final AuthRepository repository;
  FetchSetupMetadataUseCase(this.repository);
  Future<Map<String, dynamic>?> call() => repository.fetchSetupMetadata();
}

class FetchWeightHistoryUseCase {
  final AuthRepository repository;
  FetchWeightHistoryUseCase(this.repository);
  Future<List<Map<String, dynamic>>> call() => repository.fetchWeightHistory();
}

class LogWeightUseCase {
  final AuthRepository repository;
  LogWeightUseCase(this.repository);
  Future<bool> call(double weight) => repository.logWeight(weight);
}

class SaveUserProfileUseCase {
  final AuthRepository repository;
  SaveUserProfileUseCase(this.repository);
  Future<bool> call(Map<String, dynamic> data) =>
      repository.saveUserProfile(data);
}
