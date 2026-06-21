import '../repositories/diet_audit_repository.dart';

class GetClientDietAuditUseCase {
  final DietAuditRepository repository;

  GetClientDietAuditUseCase(this.repository);

  // Hàm thực thi gọi qua Repository để lấy dữ liệu từ Backend về cho Notifier
  Future<Map<String, dynamic>> execute(String clientId, String date) {
    return repository.getClientAuditData(clientId, date);
  }
}