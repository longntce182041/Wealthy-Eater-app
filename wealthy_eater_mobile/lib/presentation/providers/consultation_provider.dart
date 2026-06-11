import 'package:flutter/foundation.dart';

import '../../core/network/api_client.dart';
import '../../data/models/active_contract_model.dart';
import '../../data/models/transaction_model.dart';
import '../../data/services/consultation_service.dart';

/// State enum for consultation checkout flow.
enum CheckoutState { initial, loading, success, error }

/// Provider for the "Hire a Nutritionist" flow and transaction details.
///
/// Manages:
///  - Creating a PayOS checkout (hire flow).
///  - Loading transaction history with pagination.
///  - Loading single transaction detail.
class ConsultationProvider extends ChangeNotifier {
  final ConsultationService _service;

  ConsultationProvider({required ApiClient api})
      : _service = ConsultationService(apiClient: api);

  // ── Checkout State ──────────────────────────────────────────────────────────
  CheckoutState _checkoutState = CheckoutState.initial;
  CheckoutResult? _checkoutResult;
  String? _checkoutError;

  CheckoutState get checkoutState => _checkoutState;
  CheckoutResult? get checkoutResult => _checkoutResult;
  String? get checkoutError => _checkoutError;

  /// Initiate the hire flow: calls the API to create a PayOS checkout link.
  Future<void> hireNutritionist(String nutritionistId, {String packageType = '1_month'}) async {
    _checkoutState = CheckoutState.loading;
    _checkoutError = null;
    _checkoutResult = null;
    notifyListeners();

    try {
      _checkoutResult = await _service.hireNutritionist(nutritionistId, packageType: packageType);
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
  TransactionModel? _selectedTransaction;
  bool _isLoadingDetail = false;
  String? _detailError;

  TransactionModel? get selectedTransaction => _selectedTransaction;
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
          await _service.fetchTransactionDetail(transactionId);
    } catch (e) {
      _detailError = e.toString().replaceFirst('Exception: ', '');
    }

    _isLoadingDetail = false;
    notifyListeners();
  }

  // ── PayOS URLs State ──────────────────────────────────────────────────────
  PayOSUrlsModel? _payOSUrls;
  bool _isLoadingUrls = false;

  PayOSUrlsModel? get payOSUrls => _payOSUrls;
  bool get isLoadingUrls => _isLoadingUrls;

  /// Load PayOS intercept URLs from backend.
  Future<void> loadPayOSUrls() async {
    if (_payOSUrls != null) return; // Already loaded
    _isLoadingUrls = true;
    notifyListeners();

    try {
      _payOSUrls = await _service.fetchPayOSUrls();
    } catch (e) {
      debugPrint('Failed to load PayOS URLs: $e');
    }

    _isLoadingUrls = false;
    notifyListeners();
  }

  // ── Active Contract State ───────────────────────────────────────────────────
  ActiveContractModel? _activeContract;
  bool _isLoadingActiveContract = false;

  ActiveContractModel? get activeContract => _activeContract;
  bool get isLoadingActiveContract => _isLoadingActiveContract;
  bool get hasActiveNutritionist => _activeContract != null;

  /// Fetch the user's active consultation contract.
  Future<void> loadActiveContract() async {
    _isLoadingActiveContract = true;
    notifyListeners();

    try {
      _activeContract = await _service.fetchActiveContract();
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
      await _service.verifyPayment(orderCode);
    }

    // Poll up to 10 times (10s) waiting for the contract to become active.
    bool found = false;
    for (int i = 0; i < 10; i++) {
      try {
        final contract = await _service.fetchActiveContract();
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
}
