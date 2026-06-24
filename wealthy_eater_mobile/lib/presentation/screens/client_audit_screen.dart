import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:wealthy_eater_mobile/core/network/api_client.dart';
import 'package:wealthy_eater_mobile/data/services/diet_audit_service.dart';
import 'package:wealthy_eater_mobile/features/nutritionist/data/repositories/diet_audit_repository_impl.dart'; 
import 'package:wealthy_eater_mobile/domain/usecases/get_client_diet_audit_usecase.dart';
import 'package:wealthy_eater_mobile/presentation/widgets/diet_audit_chart.dart'; 
import '../../features/nutritionist/presentation/providers/diet_audit_notifier.dart'; 

class ClientAuditScreen extends StatefulWidget {
  final String clientId;
  const ClientAuditScreen({super.key, required this.clientId});

  @override
  State<ClientAuditScreen> createState() => _ClientAuditScreenState();
}

class _ClientAuditScreenState extends State<ClientAuditScreen> {
  late DietAuditNotifier _notifier;

  @override
  void initState() {
    super.initState();
    _notifier = DietAuditNotifier(
      GetClientDietAuditUseCase(
        DietAuditRepositoryImpl(
          DietAuditService(context.read<ApiClient>()),
        ),
      ),
    );

    WidgetsBinding.instance.addPostFrameCallback((_) {
      // 🔥 TỰ ĐỘNG LẤY NGÀY HÔM NAY THEO ĐỊNH DẠNG YYYY-MM-DD 
      final now = DateTime.now();
      final todayStr = "${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}";
      
      _notifier.loadAuditData(widget.clientId, todayStr); 
    });
  }

  @override
  void dispose() {
    _notifier.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Đối chiếu Nhật ký ăn uống (UC-54)")),
      body: ListenableBuilder(
        listenable: _notifier,
        builder: (context, child) {
          if (_notifier.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          // 📊 XỬ LÝ HIỂN THỊ LỖI THÂN THIỆN ĐỂ ĐI BÁO CÁO (Dựa theo lỗi hình image_3220a1.png)
          if (_notifier.errorMessage != null) {
            String friendlyMessage = "Không thể kết nối đến hệ thống. Vui lòng thử lại sau!";
            
            // Bắt lỗi khi khách hàng chưa có Meal Plan từ Backend quăng về
            if (_notifier.errorMessage!.contains("No active published meal plan")) {
              friendlyMessage = "Khách hàng này chưa được cấu hình hoặc kích hoạt kế hoạch ăn uống (Meal Plan).";
            } else if (_notifier.errorMessage!.contains("Route GET")) {
              friendlyMessage = "Lỗi hệ thống: Đường dẫn API đối chiếu chưa chính xác.";
            }

            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.info_outline, size: 60, color: Colors.orange),
                    const SizedBox(height: 16),
                    Text(
                      friendlyMessage,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 15, 
                        fontWeight: FontWeight.w500,
                        color: Colors.black87
                      ),
                    ),
                  ],
                ),
              ),
            );
          }

          if (_notifier.data == null) {
            return const Center(child: Text("Chưa thu thập được dữ liệu hôm nay."));
          }

          final data = _notifier.data!;
          final target = data['target'];
          final actual = data['actual'];
          final summary = data['summary'];

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: summary['isDeviated'] ? Colors.red.shade50 : Colors.green.shade50,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: summary['isDeviated'] ? Colors.red : Colors.green),
                  ),
                  child: Text(
                    "Trạng thái ngày: ${summary['status']}",
                    style: TextStyle(
                      color: summary['isDeviated'] ? Colors.red.shade900 : Colors.green.shade900,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                DietAuditChart(targetData: target, actualData: actual),
              ],
            ),
          );
        },
      ),
    );
  }
}