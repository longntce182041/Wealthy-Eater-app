import 'package:flutter/foundation.dart' show ChangeNotifier, debugPrint;
import '../../domain/entities/user.dart';
import '../../domain/usecases/auth_usecases.dart';

/// Lifecycle states for authentication flow.
enum AuthState { initial, loading, authenticated, unauthenticated, error }

/// Manages authentication state, token persistence, and user session.
class AuthProvider with ChangeNotifier {
  final RestoreSessionUseCase restoreSessionUseCase;
  final LoginUseCase loginUseCase;
  final GoogleSignInUseCase googleSignInUseCase;
  final RegisterUseCase registerUseCase;
  final VerifyOtpUseCase verifyOtpUseCase;
  final ResendOtpUseCase resendOtpUseCase;
  final LogoutUseCase logoutUseCase;
  final FetchUserProfileUseCase fetchUserProfileUseCase;
  final FetchSetupMetadataUseCase fetchSetupMetadataUseCase;
  final FetchWeightHistoryUseCase fetchWeightHistoryUseCase;
  final LogWeightUseCase logWeightUseCase;
  final SaveUserProfileUseCase saveUserProfileUseCase;

  AuthProvider({
    required this.restoreSessionUseCase,
    required this.loginUseCase,
    required this.googleSignInUseCase,
    required this.registerUseCase,
    required this.verifyOtpUseCase,
    required this.resendOtpUseCase,
    required this.logoutUseCase,
    required this.fetchUserProfileUseCase,
    required this.fetchSetupMetadataUseCase,
    required this.fetchWeightHistoryUseCase,
    required this.logWeightUseCase,
    required this.saveUserProfileUseCase,
  });

  AuthState state = AuthState.initial;
  String? errorMessage;
  UserEntity? user;
  Map<String, dynamic>? userProfile;
  List<Map<String, dynamic>> weightHistory = [];

  bool get isAuthenticated => state == AuthState.authenticated && user != null;

  // ---------------------------------------------------------------------------
  // Session Restore
  // ---------------------------------------------------------------------------

  /// Called on app start to check if a valid token exists in secure storage.
  Future<void> restoreSession() async {
    state = AuthState.loading;
    notifyListeners();

    try {
      final userEntity = await restoreSessionUseCase();
      if (userEntity != null) {
        user = userEntity;
        await _fetchUserProfile();
        await _fetchWeightHistory();
        state = AuthState.authenticated;
      } else {
        await _clearSessionState();
        state = AuthState.unauthenticated;
      }
    } catch (_) {
      state = AuthState.unauthenticated;
    }

    notifyListeners();
  }

  // ---------------------------------------------------------------------------
  // Login
  // ---------------------------------------------------------------------------

  Future<void> login(String email, String password, {String? role}) async {
    _setLoading();
    try {
      user = await loginUseCase(email, password, role: role);
      state = AuthState.authenticated;
      errorMessage = null;
      await _fetchUserProfile();
      await _fetchWeightHistory();
    } catch (e) {
      _setError(e.toString().replaceFirst('Exception: ', ''));
    }
    notifyListeners();
  }

  // ---------------------------------------------------------------------------
  // Google Sign-In
  // ---------------------------------------------------------------------------

  Future<void> googleSignIn() async {
    _setLoading();
    try {
      user = await googleSignInUseCase();
      state = AuthState.authenticated;
      errorMessage = null;
      await _fetchUserProfile();
      await _fetchWeightHistory();
    } catch (e) {
      _setError(e.toString().replaceFirst('Exception: ', ''));
    }
    notifyListeners();
  }

  // ---------------------------------------------------------------------------
  // Registration / OTP flows
  // ---------------------------------------------------------------------------

  Future<void> register(String email, String password, String confirmPassword) async {
    _setLoading();
    try {
      await registerUseCase(email, password, confirmPassword);
      state = AuthState.unauthenticated;
      errorMessage = null;
    } catch (e) {
      _setError(e.toString().replaceFirst('Exception: ', ''));
    }
    notifyListeners();
  }

  Future<void> verifyOtp(String email, String otp) async {
    _setLoading();
    try {
      final userEntity = await verifyOtpUseCase(email, otp);
      if (userEntity != null) {
        user = userEntity;
        state = AuthState.authenticated;
        errorMessage = null;
        await _fetchUserProfile();
        await _fetchWeightHistory();
      } else {
        state = AuthState.unauthenticated;
      }
    } catch (e) {
      _setError(e.toString().replaceFirst('Exception: ', ''));
    }
    notifyListeners();
  }

  Future<void> resendOtp(String email) async {
    _setLoading();
    try {
      await resendOtpUseCase(email);
      state = AuthState.unauthenticated;
      errorMessage = null;
    } catch (e) {
      _setError(e.toString().replaceFirst('Exception: ', ''));
    }
    notifyListeners();
  }

  // ---------------------------------------------------------------------------
  // Logout
  // ---------------------------------------------------------------------------

  Future<void> logout() async {
    await logoutUseCase();
    await _clearSessionState();
    state = AuthState.unauthenticated;
    notifyListeners();
  }

  // ---------------------------------------------------------------------------
  // Private helpers / profiles
  // ---------------------------------------------------------------------------

  Future<void> _fetchUserProfile() async {
    try {
      userProfile = await fetchUserProfileUseCase();
    } catch (_) {
      userProfile = null;
    }
  }

  /// Public wrapper to fetch user profile on demand.
  Future<void> fetchUserProfile() async {
    await _fetchUserProfile();
    notifyListeners();
  }

  /// Fetch dynamic setup metadata (Ingredients and Medical Conditions)
  Future<Map<String, dynamic>?> fetchSetupMetadata() async {
    try {
      return await fetchSetupMetadataUseCase();
    } catch (e) {
      debugPrint("Error fetching setup metadata: $e");
    }
    return null;
  }

  Future<void> _fetchWeightHistory() async {
    try {
      weightHistory = await fetchWeightHistoryUseCase();
    } catch (_) {
      weightHistory = [];
    }
  }

  /// Public wrapper to fetch weight logs on demand.
  Future<void> fetchWeightHistory() async {
    await _fetchWeightHistory();
    notifyListeners();
  }

  /// Log user weight via API
  Future<bool> logWeight(double weight) async {
    errorMessage = null;
    notifyListeners();
    try {
      final success = await logWeightUseCase(weight);
      if (success) {
        await _fetchUserProfile();
        await _fetchWeightHistory();
        errorMessage = null;
        notifyListeners();
        return true;
      } else {
        errorMessage = 'Log weight failed';
        notifyListeners();
        return false;
      }
    } catch (e) {
      errorMessage = e.toString().replaceFirst('Exception: ', '');
      notifyListeners();
      return false;
    }
  }

  /// Save or update user profile via API
  Future<bool> saveUserProfile(Map<String, dynamic> data) async {
    errorMessage = null;
    notifyListeners();
    try {
      final success = await saveUserProfileUseCase(data);
      if (success) {
        await _fetchUserProfile();
        errorMessage = null;
        notifyListeners();
        return true;
      } else {
        errorMessage = 'Save profile failed';
        notifyListeners();
        return false;
      }
    } catch (e) {
      errorMessage = e.toString().replaceFirst('Exception: ', '');
      notifyListeners();
      return false;
    }
  }

  Future<void> _clearSessionState() async {
    user = null;
    userProfile = null;
    weightHistory = [];
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
