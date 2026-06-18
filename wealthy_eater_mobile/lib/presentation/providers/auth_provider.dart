import 'package:flutter/foundation.dart' show kIsWeb, ChangeNotifier, debugPrint;
import 'package:google_sign_in/google_sign_in.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../core/config/secrets.dart';
import '../../core/error/app_error.dart';
import '../../core/network/api_client.dart';
import '../../domain/entities/user.dart';

/// Lifecycle states for authentication flow.
enum AuthState { initial, loading, authenticated, unauthenticated, error }

/// Manages authentication state, token persistence, and user session.
///
/// Responsibilities:
/// - Email/password login
/// - Google Sign-In
/// - Session restore on app launch (`restoreSession`)
/// - Secure token storage via [FlutterSecureStorage]
/// - Logout (clears token + user)
class AuthProvider with ChangeNotifier {
  final ApiClient _api;
  final FlutterSecureStorage _storage;

  AuthProvider({required ApiClient api, FlutterSecureStorage? storage})
      : _api = api,
        _storage = storage ?? const FlutterSecureStorage();

  AuthState state = AuthState.initial;
  String? errorMessage;
  UserEntity? user;
  Map<String, dynamic>? userProfile;
  List<Map<String, dynamic>> weightHistory = [];
  String? _accessToken;

  bool get isAuthenticated => state == AuthState.authenticated && _accessToken != null;

  // ---------------------------------------------------------------------------
  // Session Restore
  // ---------------------------------------------------------------------------

  /// Called on app start to check if a valid token exists in secure storage.
  /// Navigates accordingly without requiring user to log in again.
  Future<void> restoreSession() async {
    state = AuthState.loading;
    notifyListeners();

    try {
      final token = await _storage.read(key: 'accessToken');
      if (token == null || token.isEmpty) {
        state = AuthState.unauthenticated;
        notifyListeners();
        return;
      }

      // Verify token with backend by fetching user profile
      final res = await _api.get('/api/auth/me');
      if (res.statusCode == 200 && res.data['success'] == true) {
        _accessToken = token;
        user = UserEntity.fromJson(res.data['data'] as Map<String, dynamic>);
        await _fetchUserProfile();
        await _fetchWeightHistory();
        state = AuthState.authenticated;
      } else {
        await _clearSession();
        state = AuthState.unauthenticated;
      }
    } catch (_) {
      // Token may be expired or network unavailable — fall back to unauthenticated
      state = AuthState.unauthenticated;
    }

    notifyListeners();
  }

  // ---------------------------------------------------------------------------
  // Login
  // ---------------------------------------------------------------------------

  Future<void> login(String identifier, String password, {String? role}) async {
    _setLoading();
    try {
      final res = await _api.post(
        '/api/auth/login',
        data: {
          'identifier': identifier.trim(),
          'password': password,
          'role': role,
        },
      );

      if (res.statusCode == 200 && res.data['success'] == true) {
        await _handleAuthResponse(res.data['data'] as Map<String, dynamic>);
      } else {
        final errObj = res.data['error'];
        _setError(errObj != null && errObj['message'] != null
            ? errObj['message'].toString()
            : 'Invalid username or password');
      }
    } catch (e) {
      _setError(mapError(e).message);
    }
  }

  // ---------------------------------------------------------------------------
  // Google Sign-In
  // ---------------------------------------------------------------------------

  Future<void> googleSignIn() async {
    _setLoading();
    try {
      final GoogleSignIn googleSignIn = kIsWeb
          ? GoogleSignIn(clientId: googleClientId)
          : GoogleSignIn();

      final account = await googleSignIn.signIn();
      if (account == null) {
        _setError('Google sign-in was cancelled');
        return;
      }

      final idToken = (await account.authentication).idToken;
      if (idToken == null) {
        _setError('Failed to retrieve Google ID token');
        return;
      }

      final res = await _api.post('/api/auth/google', data: {'idToken': idToken});

      if (res.statusCode == 200 && res.data['success'] == true) {
        await _handleAuthResponse(res.data['data'] as Map<String, dynamic>);
      } else {
        _setError(res.data['message']?.toString() ?? 'Google login failed');
      }
    } catch (e) {
      _setError(mapError(e).message);
    }
  }

  // ---------------------------------------------------------------------------
  // Registration / OTP flows
  // ---------------------------------------------------------------------------

  Future<void> register(String identifier, String password, String confirmPassword, {String? role}) async {
    _setLoading();
    try {
      final res = await _api.post('/api/auth/register', data: {
        'identifier': identifier.trim(),
        'password': password,
        'confirmPassword': confirmPassword,
        'role': role,
      });

      if (res.statusCode == 200 && res.data['success'] == true) {
        // Registration started — server sent OTP. Stay unauthenticated.
        state = AuthState.unauthenticated;
        errorMessage = null;
        notifyListeners();
      } else {
        final errObj = res.data['error'];
        _setError(errObj != null && errObj['message'] != null
            ? errObj['message'].toString()
            : 'Registration failed');
      }
    } catch (e) {
      _setError(mapError(e).message);
    }
  }

  Future<void> verifyOtp(String identifier, String otp) async {
    _setLoading();
    try {
      final res = await _api.post('/api/auth/verify-otp', data: {'identifier': identifier.trim(), 'otp': otp});

      if (res.statusCode == 200 && res.data['success'] == true) {
        final data = res.data['data'] as Map<String, dynamic>?;
        if (data != null) {
          await _handleAuthResponse(data);
        } else {
          // If server didn't return tokens, fall back to unauthenticated state
          state = AuthState.unauthenticated;
          notifyListeners();
        }
      } else {
        final errObj = res.data['error'];
        _setError(errObj != null && errObj['message'] != null
            ? errObj['message'].toString()
            : 'Verification failed');
      }
    } catch (e) {
      _setError(mapError(e).message);
    }
  }

  Future<void> resendOtp(String identifier) async {
    _setLoading();
    try {
      final res = await _api.post('/api/auth/resend-otp', data: {'identifier': identifier.trim()});
      if (res.statusCode == 200 && res.data['success'] == true) {
        state = AuthState.unauthenticated;
        errorMessage = null;
        notifyListeners();
      } else {
        final errObj = res.data['error'];
        _setError(errObj != null && errObj['message'] != null
            ? errObj['message'].toString()
            : 'Resend failed');
      }
    } catch (e) {
      _setError(mapError(e).message);
    }
  }

  Future<bool> linkEmail(String email) async {
    errorMessage = null;
    notifyListeners();
    try {
      final res = await _api.post('/api/auth/link-email', data: {'email': email.trim().toLowerCase()});
      if (res.statusCode == 200 && res.data['success'] == true) {
        final userData = res.data['data'];
        if (userData is Map<String, dynamic>) {
          user = UserEntity.fromJson(userData);
        }
        notifyListeners();
        return true;
      } else {
        final errObj = res.data['error'];
        errorMessage = errObj != null && errObj['message'] != null
            ? errObj['message'].toString()
            : 'Linking email failed';
        notifyListeners();
        return false;
      }
    } catch (e) {
      errorMessage = mapError(e).message;
      notifyListeners();
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Logout
  // ---------------------------------------------------------------------------

  Future<void> logout() async {
    await _clearSession();
    state = AuthState.unauthenticated;
    notifyListeners();
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  Future<void> _handleAuthResponse(Map<String, dynamic> data) async {
    final token = data['accessToken']?.toString();
    if (token == null || token.isEmpty) {
      _setError('Invalid response from server');
      return;
    }

    _accessToken = token;
    await _storage.write(key: 'accessToken', value: token);

    final rToken = data['refreshToken']?.toString();
    if (rToken != null && rToken.isNotEmpty) {
      await _storage.write(key: 'refreshToken', value: rToken);
    }

    final userData = data['user'];
    if (userData is Map<String, dynamic>) {
      user = UserEntity.fromJson(userData);
    }

    state = AuthState.authenticated;
    errorMessage = null;
    // Fetch profile after successful login
    await _fetchUserProfile();
    await _fetchWeightHistory();
    notifyListeners();
  }

  Future<void> _fetchUserProfile() async {
    try {
      final res = await _api.get('/api/profile/me');
      if (res.statusCode == 200 && res.data['success'] == true && res.data['data'] != null) {
        userProfile = Map<String, dynamic>.from(res.data['data'] as Map<String, dynamic>);
      } else {
        userProfile = null;
      }
    } catch (_) {
      userProfile = null;
    }
  }

  /// Public wrapper to fetch user profile on demand.
  Future<void> fetchUserProfile() async => _fetchUserProfile();

  /// Fetch dynamic setup metadata (Ingredients and Medical Conditions)
  Future<Map<String, dynamic>?> fetchSetupMetadata() async {
    try {
      final res = await _api.get('/api/profile/setup-metadata');
      if (res.statusCode == 200 && res.data['success'] == true && res.data['data'] != null) {
        return Map<String, dynamic>.from(res.data['data'] as Map<String, dynamic>);
      }
    } catch (e) {
      debugPrint("Error fetching setup metadata: $e");
    }
    return null;
  }

  Future<void> _fetchWeightHistory() async {
    try {
      final res = await _api.get('/api/profile/weight-history');
      if (res.statusCode == 200 && res.data['success'] == true && res.data['data'] != null) {
        weightHistory = List<Map<String, dynamic>>.from(
          (res.data['data'] as List).map((x) => Map<String, dynamic>.from(x as Map)),
        );
      } else {
        weightHistory = [];
      }
    } catch (_) {
      weightHistory = [];
    }
  }

  /// Public wrapper to fetch weight logs on demand.
  Future<void> fetchWeightHistory() async => _fetchWeightHistory();

  /// Log user weight via API, refresh user profile to recalculate health indexes, and refresh weight history.
  Future<bool> logWeight(double weight) async {
    errorMessage = null;
    notifyListeners();
    try {
      final res = await _api.post('/api/profile/weight', data: {'weight': weight});
      if (res.statusCode == 200 && res.data['success'] == true) {
        await _fetchUserProfile();
        await _fetchWeightHistory();
        errorMessage = null;
        notifyListeners();
        return true;
      } else {
        errorMessage = res.data['message']?.toString() ?? 'Log weight failed';
        notifyListeners();
        return false;
      }
    } catch (e) {
      errorMessage = mapError(e).message;
      notifyListeners();
      return false;
    }
  }

  /// Save or update user profile via API and refresh local cache.
  Future<bool> saveUserProfile(Map<String, dynamic> data) async {
    errorMessage = null;
    notifyListeners();
    try {
      final res = await _api.post('/api/profile', data: data);
      if (res.statusCode == 200 && res.data['success'] == true) {
        await _fetchUserProfile();
        errorMessage = null;
        notifyListeners();
        return true;
      } else {
        errorMessage = res.data['message']?.toString() ?? 'Save profile failed';
        notifyListeners();
        return false;
      }
    } catch (e) {
      errorMessage = mapError(e).message;
      notifyListeners();
      return false;
    }
  }

  /// Change user password via API.
  Future<bool> changePassword(String oldPassword, String newPassword) async {
    errorMessage = null;
    notifyListeners();
    try {
      final res = await _api.post(
        '/api/auth/change-password',
        data: {
          'oldPassword': oldPassword,
          'newPassword': newPassword,
        },
      );
      if (res.statusCode == 200 && res.data['success'] == true) {
        errorMessage = null;
        notifyListeners();
        return true;
      } else {
        final errObj = res.data['error'];
        errorMessage = errObj != null && errObj['message'] != null
            ? errObj['message'].toString()
            : (res.data['message']?.toString() ?? 'Đổi mật khẩu thất bại');
        notifyListeners();
        return false;
      }
    } catch (e) {
      errorMessage = mapError(e).message;
      notifyListeners();
      return false;
    }
  }

  Future<void> _clearSession() async {
    _accessToken = null;
    user = null;
    await _storage.delete(key: 'accessToken');
    await _storage.delete(key: 'refreshToken');
  }

  void _setLoading() {
    state = AuthState.loading;
    errorMessage = null;
    notifyListeners();
  }

  void _setError(String message) {
    state = AuthState.error;
    errorMessage = message;
    notifyListeners();
  }
}
