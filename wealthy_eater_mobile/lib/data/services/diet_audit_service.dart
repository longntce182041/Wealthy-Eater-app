import 'dart:convert';
import 'package:http/http.dart' as http;

class DietAuditService {
  final String baseUrl = "http://localhost:5000/api"; // Chỉnh theo IP Backend của ní

  // Hàm bắn request trực tiếp lên API Backend hôm qua mình vừa làm
  Future<Map<String, dynamic>> fetchClientAuditLogs(String clientId, String dateStr) async {
    // SỬA DÒNG NÀY: Thay 'customer-auditing' bằng 'diet-audit' cho khớp với router.use bên NodeJS
    final url = Uri.parse('$baseUrl/diet-audit/nutritionist/clients/$clientId/audit-logs?date=$dateStr');
    
    final response = await http.get(
      url,
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': 'Bearer <TOKEN>', // Mở ra nếu Backend yêu cầu đăng nhập
      },
    );

    if (response.statusCode == 200) {
      final responseData = json.decode(response.body);
      return responseData['data']; // Lấy chính xác cục data đối chiếu
    } else {
      throw Exception('Lỗi hệ thống Backend: ${response.body}');
    }
  }
}