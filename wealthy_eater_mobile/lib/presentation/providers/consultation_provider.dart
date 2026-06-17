import 'package:flutter/foundation.dart';

import '../../domain/entities/consultation.dart';
import '../../domain/usecases/consultation_usecases.dart';

/// State enum for consultation checkout flow.
enum CheckoutState { initial, loading, success, error }

/// Provider for the "Hire a Nutritionist" flow and transaction details.
///
/// Manages:
///  - Creating a PayOS checkout (hire flow).
///  - Loading transaction history with pagination.
///  - Loading single transaction detail.
class ConsultationProvider extends ChangeNotifier {
  final HireNutritionistUseCase hireNutritionistUseCase;
  final GetTransactionDetailUseCase getTransactionDetailUseCase;
  final VerifyPaymentUseCase verifyPaymentUseCase;
  final GetPayOSUrlsUseCase getPayOSUrlsUseCase;
  final GetActiveContractUseCase getActiveContractUseCase;
  final RequestMealPlanUseCase requestMealPlanUseCase;
  final GetMealPlanRequestStatusUseCase getMealPlanRequestStatusUseCase;

  ConsultationProvider({
    required this.hireNutritionistUseCase,
    required this.getTransactionDetailUseCase,
    required this.verifyPaymentUseCase,
    required this.getPayOSUrlsUseCase,
    required this.getActiveContractUseCase,
    required this.requestMealPlanUseCase,
    required this.getMealPlanRequestStatusUseCase,
  });

  // ── Checkout State ──────────────────────────────────────────────────────────
  CheckoutState _checkoutState = CheckoutState.initial;
  CheckoutResultEntity? _checkoutResult;
  String? _checkoutError;

  CheckoutState get checkoutState => _checkoutState;
  CheckoutResultEntity? get checkoutResult => _checkoutResult;
  String? get checkoutError => _checkoutError;

  /// Initiate the hire flow: calls the API to create a PayOS checkout link.
  Future<void> hireNutritionist(String nutritionistId, {String packageType = '1_month'}) async {
    _checkoutState = CheckoutState.loading;
    _checkoutError = null;
    _checkoutResult = null;
    notifyListeners();

    try {
      _checkoutResult = await hireNutritionistUseCase(nutritionistId, packageType: packageType);
      _checkoutState = CheckoutState.success;
    } catch (e) {
      _checkoutError = e.toString().replaceFirst('Exception: ', '');
      _checkoutState = CheckoutState.error;
    }

    notifyListeners();
  }

  /// Reset checkout state (e.g., after navigating away from payment).
  void resetCheckout() {
    _checkoutState = CheckoutState.initial;
    _checkoutResult = null;
    _checkoutError = null;
    notifyListeners();
  }

  // ── Transaction Detail State ────────────────────────────────────────────────
  ConsultationTransactionEntity? _selectedTransaction;
  bool _isLoadingDetail = false;
  String? _detailError;

  ConsultationTransactionEntity? get selectedTransaction => _selectedTransaction;
  bool get isLoadingDetail => _isLoadingDetail;
  String? get detailError => _detailError;

  /// Fetch a single transaction's full details.
  Future<void> loadTransactionDetail(String transactionId) async {
    _isLoadingDetail = true;
    _detailError = null;
    _selectedTransaction = null;
    notifyListeners();

    try {
      _selectedTransaction =
          await getTransactionDetailUseCase(transactionId);
    } catch (e) {
      _detailError = e.toString().replaceFirst('Exception: ', '');
    }

    _isLoadingDetail = false;
    notifyListeners();
  }

  // ── PayOS URLs State ──────────────────────────────────────────────────────
  PayOSUrlsEntity? _payOSUrls;
  bool _isLoadingUrls = false;

  PayOSUrlsEntity? get payOSUrls => _payOSUrls;
  bool get isLoadingUrls => _isLoadingUrls;

  /// Load PayOS intercept URLs from backend.
  Future<void> loadPayOSUrls() async {
    if (_payOSUrls != null) return; // Already loaded
    _isLoadingUrls = true;
    notifyListeners();

    try {
      _payOSUrls = await getPayOSUrlsUseCase();
    } catch (e) {
      debugPrint('Failed to load PayOS URLs: $e');
    }

    _isLoadingUrls = false;
    notifyListeners();
  }

  // ── Active Contract State ───────────────────────────────────────────────────
  ConsultationContractEntity? _activeContract;
  bool _isLoadingActiveContract = false;

  ConsultationContractEntity? get activeContract => _activeContract;
  bool get isLoadingActiveContract => _isLoadingActiveContract;
  bool get hasActiveNutritionist => _activeContract != null;

  /// Fetch the user's active consultation contract.
  Future<void> loadActiveContract() async {
    _isLoadingActiveContract = true;
    notifyListeners();

    try {
      _activeContract = await getActiveContractUseCase();
    } catch (e) {
      debugPrint('Failed to load active contract: $e');
      _activeContract = null;
    }

    _isLoadingActiveContract = false;
    notifyListeners();
  }

  /// After a successful payment, syncs the DB with PayOS and polls until
  /// the contract is active. If [orderCode] is provided, the backend will
  /// query PayOS directly to activate the contract — bypassing the need
  /// for PayOS webhooks to arrive (essential for local dev with ngrok delays).
  Future<bool> verifyAndLoadActiveContract({String? orderCode}) async {
    _isLoadingActiveContract = true;
    notifyListeners();

    // Tell backend to sync with PayOS now, before polling.
    if (orderCode != null && orderCode.isNotEmpty) {
      debugPrint('[ConsultationProvider] Syncing payment with backend, orderCode=$orderCode');
      await verifyPaymentUseCase(orderCode);
    }

    // Poll up to 10 times (10s) waiting for the contract to become active.
    bool found = false;
    for (int i = 0; i < 10; i++) {
      try {
        final contract = await getActiveContractUseCase();
        if (contract != null) {
          _activeContract = contract;
          found = true;
          break;
        }
      } catch (e) {
        debugPrint('[ConsultationProvider] Polling error (attempt $i): $e');
      }
      await Future.delayed(const Duration(seconds: 1));
    }

    if (!found) _activeContract = null;
    _isLoadingActiveContract = false;
    notifyListeners();
    return found;
  }

  // ── Meal Plan Request State ────────────────────────────────────────────────
  String? _mealPlanRequestStatus;
  bool _isRequestingMealPlan = false;

  String? get mealPlanRequestStatus => _mealPlanRequestStatus;
  bool get isRequestingMealPlan => _isRequestingMealPlan;

  Future<void> loadMealPlanRequestStatus() async {
    try {
      _mealPlanRequestStatus = await getMealPlanRequestStatusUseCase();
    } catch (e) {
      debugPrint('Failed to load meal plan request status: $e');
      _mealPlanRequestStatus = 'NONE';
    }
    notifyListeners();
  }

  Future<bool> submitMealPlanRequest() async {
    _isRequestingMealPlan = true;
    notifyListeners();

    bool success = false;
    try {
      success = await requestMealPlanUseCase();
      if (success) {
        _mealPlanRequestStatus = 'PENDING';
      }
    } catch (e) {
      debugPrint('Failed to submit meal plan request: $e');
    }

    _isRequestingMealPlan = false;
    notifyListeners();
    return success;
  }
}

