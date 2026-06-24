import '../../core/network/api_client.dart';
import '../../core/error/app_error.dart';

class DietAuditService {
  final ApiClient apiClient;

  DietAuditService(this.apiClient);

  // Hàm bắn request trực tiếp lên API Backend
  Future<Map<String, dynamic>> fetchClientAuditLogs(String clientId, String dateStr) async {
    try {
      final response = await apiClient.get('/api/diet-audit/nutritionist/clients/$clientId/audit-logs?date=$dateStr');
      
      if (response.statusCode == 200 && response.data['success'] == true) {
        return Map<String, dynamic>.from(response.data['data'] as Map);
      } else {
        throw AppError(response.data['error']?['message'] ?? 'Lỗi hệ thống Backend');
      }
    } catch (e) {
      throw mapError(e);
    }
  }
}