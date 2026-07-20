import '../../core/error/app_error.dart';
import '../../core/network/api_client.dart';
import '../models/weight_log_model.dart';

class BiometricAuditService {
  final ApiClient _apiClient;

  BiometricAuditService({required ApiClient apiClient})
      : _apiClient = apiClient;

  /// Fetches the biometric history logs for a specific client (UC-50)
  Future<List<WeightLogModel>> getClientBiometricHistory(
      String clientId) async {
    try {
      final response =
          await _apiClient.get('/api/nutritionists/audit-biometrics/$clientId');

      if (response.statusCode == 200 && response.data['success'] == true) {
        final data = response.data['data'] as List?;
        if (data != null) {
          return data.map((json) => WeightLogModel.fromJson(json)).toList();
        }
        return [];
      }

      throw AppError(
        response.data['error']?['message'] ??
            'Failed to load biometric history.',
      );
    } catch (e) {
      throw mapError(e);
    }
  }
}
