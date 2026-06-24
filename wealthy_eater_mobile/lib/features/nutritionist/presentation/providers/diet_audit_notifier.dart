import 'package:flutter/foundation.dart';
import 'package:wealthy_eater_mobile/domain/usecases/get_client_diet_audit_usecase.dart';

class DietAuditNotifier extends ChangeNotifier {
  final GetClientDietAuditUseCase _useCase;

  bool _isLoading = false;
  Map<String, dynamic>? _data;
  String? _errorMessage;

  DietAuditNotifier(this._useCase);

  // Getter để UI lấy dữ liệu hiển thị
  bool get isLoading => _isLoading;
  Map<String, dynamic>? get data => _data;
  String? get errorMessage => _errorMessage;

  Future<void> loadAuditData(String clientId, String date) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final result = await _useCase.execute(clientId, date);
      _data = result;
    } catch (e) {
      _errorMessage = e.toString();
    }

    _isLoading = false;
    notifyListeners();
  }
}