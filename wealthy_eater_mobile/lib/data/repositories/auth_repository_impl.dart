import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:google_sign_in/google_sign_in.dart';

import '../../core/config/secrets.dart';
import '../../core/error/app_error.dart';
import '../../core/network/api_client.dart';
import '../../domain/entities/user.dart';
import '../../domain/repositories/auth_repository.dart';

class AuthRepositoryImpl implements AuthRepository {
  final ApiClient apiClient;
  final FlutterSecureStorage storage;

  AuthRepositoryImpl({
    required this.apiClient,
    FlutterSecureStorage? storage,
  }) : storage = storage ?? const FlutterSecureStorage();

  @override
  Future<UserEntity?> restoreSession() async {
    try {
      final token = await storage.read(key: 'accessToken');
      if (token == null || token.isEmpty) {
        return null;
      }

      final res = await apiClient.get('/api/auth/me');
      if (res.statusCode == 200 && res.data['success'] == true) {
        return UserEntity.fromJson(res.data['data'] as Map<String, dynamic>);
      } else {
        await _clearSession();
        return null;
      }
    } catch (_) {
      return null;
    }
  }

  @override
  Future<UserEntity> login(String email, String password, {String? role}) async {
    try {
      final res = await apiClient.post(
        '/api/auth/login',
        data: {
          'email': email.trim(),
          'password': password,
          'role': role,
        },
      );

      if (res.statusCode == 200 && res.data['success'] == true) {
        return await _handleAuthResponse(res.data['data'] as Map<String, dynamic>);
      } else {
        throw AppError(res.data['message']?.toString() ?? 'Invalid username or password');
      }
    } catch (e) {
      throw mapError(e);
    }
  }

  @override
  Future<UserEntity> googleSignIn() async {
    try {
      final GoogleSignIn googleSignIn = kIsWeb
          ? GoogleSignIn(clientId: googleClientId)
          : GoogleSignIn();

      final account = await googleSignIn.signIn();
      if (account == null) {
        throw AppError('Google sign-in was cancelled');
      }

      final idToken = (await account.authentication).idToken;
      if (idToken == null) {
        throw AppError('Failed to retrieve Google ID token');
      }

      final res = await apiClient.post('/api/auth/google', data: {'idToken': idToken});

      if (res.statusCode == 200 && res.data['success'] == true) {
        return await _handleAuthResponse(res.data['data'] as Map<String, dynamic>);
      } else {
        throw AppError(res.data['message']?.toString() ?? 'Google login failed');
      }
    } catch (e) {
      throw mapError(e);
    }
  }

  @override
  Future<void> register(String email, String password, String confirmPassword) async {
    try {
      final res = await apiClient.post('/api/auth/register', data: {
        'email': email.trim(),
        'password': password,
        'confirmPassword': confirmPassword,
      });

      if (res.statusCode != 200 || res.data['success'] != true) {
        throw AppError(res.data['message']?.toString() ?? 'Registration failed');
      }
    } catch (e) {
      throw mapError(e);
    }
  }

  @override
  Future<UserEntity?> verifyOtp(String email, String otp) async {
    try {
      final res = await apiClient.post('/api/auth/verify-otp', data: {
        'email': email.trim(),
        'otp': otp,
      });

      if (res.statusCode == 200 && res.data['success'] == true) {
        final data = res.data['data'] as Map<String, dynamic>?;
        if (data != null) {
          return await _handleAuthResponse(data);
        }
        return null;
      } else {
        throw AppError(res.data['message']?.toString() ?? 'Verification failed');
      }
    } catch (e) {
      throw mapError(e);
    }
  }

  @override
  Future<void> resendOtp(String email) async {
    try {
      final res = await apiClient.post('/api/auth/resend-otp', data: {'email': email.trim()});
      if (res.statusCode != 200 || res.data['success'] != true) {
        throw AppError(res.data['message']?.toString() ?? 'Resend failed');
      }
    } catch (e) {
      throw mapError(e);
    }
  }

  @override
  Future<void> logout() async {
    await _clearSession();
  }

  @override
  Future<Map<String, dynamic>?> fetchUserProfile() async {
    try {
      final res = await apiClient.get('/api/profile/me');
      if (res.statusCode == 200 && res.data['success'] == true && res.data['data'] != null) {
        return Map<String, dynamic>.from(res.data['data'] as Map<String, dynamic>);
      }
    } catch (_) {
      // Return null
    }
    return null;
  }

  @override
  Future<Map<String, dynamic>?> fetchSetupMetadata() async {
    try {
      final res = await apiClient.get('/api/profile/setup-metadata');
      if (res.statusCode == 200 && res.data['success'] == true && res.data['data'] != null) {
        return Map<String, dynamic>.from(res.data['data'] as Map<String, dynamic>);
      }
    } catch (_) {
      // Return null
    }
    return null;
  }

  @override
  Future<List<Map<String, dynamic>>> fetchWeightHistory() async {
    try {
      final res = await apiClient.get('/api/profile/weight-history');
      if (res.statusCode == 200 && res.data['success'] == true && res.data['data'] != null) {
        return List<Map<String, dynamic>>.from(
          (res.data['data'] as List).map((x) => Map<String, dynamic>.from(x as Map)),
        );
      }
    } catch (_) {
      // Return empty
    }
    return [];
  }

  @override
  Future<bool> logWeight(double weight) async {
    try {
      final res = await apiClient.post('/api/profile/weight', data: {'weight': weight});
      return res.statusCode == 200 && res.data['success'] == true;
    } catch (e) {
      throw mapError(e);
    }
  }

  @override
  Future<bool> saveUserProfile(Map<String, dynamic> data) async {
    try {
      final res = await apiClient.post('/api/profile', data: data);
      return res.statusCode == 200 && res.data['success'] == true;
    } catch (e) {
      throw mapError(e);
    }
  }

  // Helper methods
  Future<UserEntity> _handleAuthResponse(Map<String, dynamic> data) async {
    final token = data['accessToken']?.toString();
    if (token == null || token.isEmpty) {
      throw AppError('Invalid response from server');
    }

    await storage.write(key: 'accessToken', value: token);

    final rToken = data['refreshToken']?.toString();
    if (rToken != null && rToken.isNotEmpty) {
      await storage.write(key: 'refreshToken', value: rToken);
    }

    final userData = data['user'];
    if (userData is Map<String, dynamic>) {
      return UserEntity.fromJson(userData);
    }
    throw AppError('Invalid user data received from server');
  }

  Future<void> _clearSession() async {
    await storage.delete(key: 'accessToken');
    await storage.delete(key: 'refreshToken');
  }
}
