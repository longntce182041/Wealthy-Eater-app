abstract class DietAuditRepository {
  Future<Map<String, dynamic>> getClientAuditData(String clientId, String date);
}