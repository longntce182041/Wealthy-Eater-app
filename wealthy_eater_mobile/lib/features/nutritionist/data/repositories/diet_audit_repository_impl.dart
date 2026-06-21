import 'package:wealthy_eater_mobile/domain/repositories/diet_audit_repository.dart';
import 'package:wealthy_eater_mobile/data/services/diet_audit_service.dart';

class DietAuditRepositoryImpl implements DietAuditRepository {
  final DietAuditService service;
  DietAuditRepositoryImpl(this.service);

  @override
  Future<Map<String, dynamic>> getClientAuditData(String clientId, String date) {
    return service.fetchClientAuditLogs(clientId, date);
  }
}