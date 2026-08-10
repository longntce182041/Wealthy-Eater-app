import 'package:flutter/foundation.dart';

import '../../core/error/app_error.dart';
import '../../core/network/api_client.dart';
import '../../data/models/weight_log_model.dart';
import '../../data/services/biometric_audit_service.dart';

enum BiometricTimeFilter {
  oneWeek,
  oneMonth,
  threeMonths,
  allTime,
}

class BiometricAuditProvider extends ChangeNotifier {
  final BiometricAuditService _service;

  BiometricAuditProvider({required ApiClient apiClient})
      : _service = BiometricAuditService(apiClient: apiClient);

  // ── State ──────────────────────────────────────────────────────────────────
  bool _isLoading = false;
  String? _error;
  List<WeightLogModel> _allLogs = [];
  List<WeightLogModel> _filteredLogs = [];
  BiometricTimeFilter _selectedFilter = BiometricTimeFilter.oneMonth;
  Map<String, dynamic>? _userProfile;
  Map<String, dynamic>? _userDietary;

  // ── Getters ────────────────────────────────────────────────────────────────
  bool get isLoading => _isLoading;
  String? get error => _error;
  List<WeightLogModel> get allLogs => _allLogs;
  List<WeightLogModel> get filteredLogs => _filteredLogs;
  BiometricTimeFilter get selectedFilter => _selectedFilter;
  bool get isEmpty => _allLogs.isEmpty && _userProfile == null;
  Map<String, dynamic>? get userProfile => _userProfile;
  Map<String, dynamic>? get userDietary => _userDietary;

  // ── Computed Metrics ───────────────────────────────────────────────────────
  double get baselineWeight {
    if (_allLogs.isEmpty) return 0.0;
    // Since logs are sorted oldest -> newest, the first item is the baseline
    return _allLogs.first.weight;
  }

  double get currentWeight {
    if (_allLogs.isEmpty) return 0.0;
    // The last item is the most recent
    return _allLogs.last.weight;
  }

  double get varianceDelta {
    if (_allLogs.length < 2) return 0.0;
    return currentWeight - baselineWeight;
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  /// Fetches biometric history for a client
  Future<void> fetchClientBiometrics(String clientId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _service.getClientBiometricHistory(clientId);
      _allLogs = result.logs;
      _userProfile = result.profile;
      _userDietary = result.dietary;
      _applyFilter(); // Will update _filteredLogs based on _selectedFilter
    } catch (e) {
      _error = mapError(e).message;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Updates the time filter and recalculates the visible chart data
  void setFilter(BiometricTimeFilter filter) {
    if (_selectedFilter == filter) return;
    _selectedFilter = filter;
    _applyFilter();
    notifyListeners();
  }

  void _applyFilter() {
    if (_allLogs.isEmpty) {
      _filteredLogs = [];
      return;
    }

    final now = DateTime.now();
    DateTime threshold;

    switch (_selectedFilter) {
      case BiometricTimeFilter.oneWeek:
        threshold = now.subtract(const Duration(days: 7));
        break;
      case BiometricTimeFilter.oneMonth:
        threshold = now.subtract(const Duration(days: 30));
        break;
      case BiometricTimeFilter.threeMonths:
        threshold = now.subtract(const Duration(days: 90));
        break;
      case BiometricTimeFilter.allTime:
        _filteredLogs = List.from(_allLogs);
        return;
    }

    _filteredLogs = _allLogs.where((log) => log.date.isAfter(threshold)).toList();
    
    // Fallback: If filtering results in 0 data points, but we have data,
    // just show the latest point so the chart isn't completely broken,
    // or fallback to all-time. Let's fallback to all-time for safety if empty.
    if (_filteredLogs.isEmpty && _allLogs.isNotEmpty) {
      // Find the most recent log and just show it
      _filteredLogs = [_allLogs.last];
    }
  }

  void reset() {
    _isLoading = false;
    _error = null;
    _allLogs = [];
    _filteredLogs = [];
    _selectedFilter = BiometricTimeFilter.oneMonth;
    _userProfile = null;
    _userDietary = null;
    notifyListeners();
  }
}
