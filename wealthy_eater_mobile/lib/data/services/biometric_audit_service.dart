import '../../core/error/app_error.dart';
import '../../core/network/api_client.dart';
import '../models/weight_log_model.dart';

/// Combined result from the biometric history endpoint
class BiometricAuditResult {
  final List<WeightLogModel> logs;
  final Map<String, dynamic>? profile;
  final Map<String, dynamic>? dietary;

  const BiometricAuditResult({
    required this.logs,
    this.profile,
    this.dietary,
  });
}

class BiometricAuditService {
  final ApiClient _apiClient;

  BiometricAuditService({required ApiClient apiClient})
      : _apiClient = apiClient;

  /// Fetches the biometric history logs + UserProfile + UserDietary for a client (UC-50)
  Future<BiometricAuditResult> getClientBiometricHistory(
      String clientId) async {
    try {
      final response =
          await _apiClient.get('/api/nutritionists/audit-biometrics/$clientId');

      if (response.statusCode == 200 && response.data['success'] == true) {
        final data = response.data['data'];

        // New response shape: { logs: [], profile: {}, dietary: {} }
        if (data is Map<String, dynamic>) {
          final logsList = data['logs'] as List? ?? [];
          final logs = logsList
              .map((json) => WeightLogModel.fromJson(json))
              .toList();
          final profile = data['profile'] as Map<String, dynamic>?;
          final dietary = data['dietary'] as Map<String, dynamic>?;
          return BiometricAuditResult(logs: logs, profile: profile, dietary: dietary);
        }

        // Fallback for legacy array response
        if (data is List) {
          final logs = data.map((json) => WeightLogModel.fromJson(json)).toList();
          return BiometricAuditResult(logs: logs);
        }

        return const BiometricAuditResult(logs: []);
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
