import 'package:flutter/foundation.dart';
import '../../core/network/api_client.dart';
import '../../data/models/nutritionist_model.dart';
import '../../data/services/nutritionist_service.dart';

class NutritionistProvider extends ChangeNotifier {
  final NutritionistService _service;

  NutritionistProvider({required ApiClient api})
      : _service = NutritionistService(apiClient: api);

  List<NutritionistModel> _nutritionists = [];
  bool _isLoading = false;
  String? _error;

  List<NutritionistModel> get nutritionists => _nutritionists;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> fetchNutritionists() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _nutritionists = await _service.fetchNutritionists();
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
