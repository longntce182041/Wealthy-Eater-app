import 'package:dio/dio.dart';

import '../../core/error/app_error.dart';
import '../../core/network/api_client.dart';
import '../models/active_contract_model.dart';
import '../models/transaction_model.dart';

/// Service layer for consultation/hire API calls.
class ConsultationService {
  final ApiClient apiClient;

  ConsultationService({required this.apiClient});

  /// POST /api/user/consultations/hire
  /// Creates a PayOS checkout link for hiring a nutritionist.
  Future<CheckoutResult> hireNutritionist(String nutritionistId, {String packageType = '1_month'}) async {
    try {
      final response = await apiClient.post(
        '/api/user/consultations/hire',
        data: {
          'nutritionist_id': nutritionistId,
          'package_type': packageType,
        },
      );

      if (response.statusCode == 201 && response.data['success'] == true) {
        return CheckoutResult.fromJson(response.data['data']);
      }

      throw AppError(
        response.data['error']?['message'] ?? 'Unable to create payment link.',
      );
    } catch (e) {
      throw mapError(e);
    }
  }

  /// GET /api/user/consultations/transactions/:id
  /// Fetches a single transaction detail.
  Future<TransactionModel> fetchTransactionDetail(String transactionId) async {
    try {
      final response = await apiClient.get(
        '/api/user/consultations/transactions/$transactionId',
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        return TransactionModel.fromJson(response.data['data']);
      }

      throw AppError(
        response.data['error']?['message'] ?? 'Unable to load transaction.',
      );
    } catch (e) {
      throw mapError(e);
    }
  }

  /// POST /api/user/consultations/verify-payment
  /// Manually asks the backend to verify the transaction status with PayOS directly.
  /// Extremely useful for testing locally where PayOS webhooks cannot reach localhost.
  Future<bool> verifyPayment(String orderCode) async {
    try {
      final response = await apiClient.post(
        '/api/user/consultations/verify-payment',
        data: {'order_code': orderCode},
      );

      return response.statusCode == 200 && response.data['success'] == true;
    } catch (e) {
      return false; // Silently fail verification, let polling or other mechanisms handle it
    }
  }

  /// GET /api/user/consultations/payos/urls
  /// Fetches configured PayOS URLs for WebView interception.
  Future<PayOSUrlsModel> fetchPayOSUrls() async {
    try {
      final response = await apiClient.get('/api/user/consultations/payos/urls');

      if (response.statusCode == 200 && response.data['success'] == true) {
        return PayOSUrlsModel.fromJson(response.data['data']);
      }

      throw AppError(
        response.data['error']?['message'] ?? 'Unable to fetch PayOS URLs.',
      );
    } catch (e) {
      throw mapError(e);
    }
  }

  /// GET /api/user/consultations/active
  /// Fetches the user's active consultation contract. Returns null if none.
  Future<ActiveContractModel?> fetchActiveContract() async {
    try {
      final response = await apiClient.get('/api/user/consultations/active');

      if (response.statusCode == 200 && response.data['success'] == true) {
        if (response.data['data'] == null) return null;
        return ActiveContractModel.fromJson(response.data['data']);
      }

      throw AppError(
        response.data['error']?['message'] ?? 'Unable to fetch active contract.',
      );
    } catch (e) {
      throw mapError(e);
    }
  }
}
