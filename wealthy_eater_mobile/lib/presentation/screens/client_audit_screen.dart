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
      // Auto-fetch today's audit data in YYYY-MM-DD format
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
      appBar: AppBar(title: const Text("Diet Log Comparison (UC-54)")),
      body: ListenableBuilder(
        listenable: _notifier,
        builder: (context, child) {
          if (_notifier.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (_notifier.errorMessage != null) {
            String friendlyMessage = "Unable to connect to the server. Please try again later.";
            
            // Handle specific backend error for missing Meal Plan
            if (_notifier.errorMessage!.contains("No active published meal plan")) {
              friendlyMessage = "This client does not have an active Meal Plan configured yet.";
            } else if (_notifier.errorMessage!.contains("Route GET")) {
              friendlyMessage = "System error: The audit API route is incorrect.";
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
            return const Center(child: Text("No audit data collected for today yet."));
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
                    "Daily Status: ${summary['status']}",
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