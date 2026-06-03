import 'package:flutter/foundation.dart' show kIsWeb, ChangeNotifier;
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

  Future<void> login(String email, String password) async {
    _setLoading();
    try {
      final res = await _api.post(
        '/api/auth/login',
        data: {'email': email.trim(), 'password': password},
      );

      if (res.statusCode == 200 && res.data['success'] == true) {
        await _handleAuthResponse(res.data['data'] as Map<String, dynamic>);
      } else {
        _setError(res.data['message']?.toString() ?? 'Login failed');
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
      final googleSignIn = kIsWeb
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

    final userData = data['user'];
    if (userData is Map<String, dynamic>) {
      user = UserEntity.fromJson(userData);
    }

    state = AuthState.authenticated;
    errorMessage = null;
    notifyListeners();
  }

  Future<void> _clearSession() async {
    _accessToken = null;
    user = null;
    await _storage.delete(key: 'accessToken');
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
