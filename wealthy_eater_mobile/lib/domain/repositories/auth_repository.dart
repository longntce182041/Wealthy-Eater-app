import '../entities/user.dart';

abstract class AuthRepository {
  Future<UserEntity?> restoreSession();
  Future<UserEntity> login(String email, String password, {String? role});
  Future<UserEntity> googleSignIn();
  Future<void> register(String email, String password, String confirmPassword);
  Future<UserEntity?> verifyOtp(String email, String otp);
  Future<void> resendOtp(String email);
  Future<void> logout();
  Future<Map<String, dynamic>?> fetchUserProfile();
  Future<Map<String, dynamic>?> fetchSetupMetadata();
  Future<List<Map<String, dynamic>>> fetchWeightHistory();
  Future<bool> logWeight(double weight);
  Future<bool> saveUserProfile(Map<String, dynamic> data);
}
