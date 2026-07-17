/// pantry_provider.dart — State management for the Virtual Pantry feature.

import 'package:flutter/foundation.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/error/app_error.dart';
import '../../core/network/api_client.dart';
import '../../data/models/pantry_model.dart';
import '../../data/services/pantry_service.dart';

class PantryProvider extends ChangeNotifier {
  final PantryService _service;
  final ApiClient _apiClient;
  final ImagePicker _picker = ImagePicker();

  PantryProvider({required ApiClient api})
      : _apiClient = api,
        _service = PantryService(apiClient: api);

  // ── State ──────────────────────────────────────────────────────────────────
  bool _isLoading = false;
  String? _error;
  List<PantryIngredient> _ingredients = [];
  List<PantryIngredient> _tempIngredients = [];
  List<String> _masterIngredientNames = [];
  String? _scannedImagePath;

  // ── Getters ────────────────────────────────────────────────────────────────
  bool get isLoading => _isLoading;
  String? get error => _error;
  List<PantryIngredient> get ingredients => _ingredients;
  List<PantryIngredient> get tempIngredients => _tempIngredients;
  List<String> get masterIngredientNames => _masterIngredientNames;
  String? get scannedImagePath => _scannedImagePath;

  bool get supportsCameraSource {
    if (kIsWeb) return false;
    final platform = defaultTargetPlatform;
    return platform == TargetPlatform.android || platform == TargetPlatform.iOS;
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  /// Fetches the user's current pantry items and populates the manual form list.
  Future<void> fetchPantry() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final list = await _service.getPantry();
      _ingredients = list;
      _tempIngredients = List.from(list);

      if (_masterIngredientNames.isEmpty) {
        await loadMasterIngredients();
      }

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      _error = mapError(e).message;
      notifyListeners();
    }
  }

  /// Fetches master ingredients list to feed into the manual input autocomplete field.
  Future<void> loadMasterIngredients() async {
    try {
      final response = await _apiClient.get('/api/profile/setup-metadata');
      if (response.statusCode == 200 && response.data['success'] == true) {
        final data = response.data['data'];
        if (data != null && data['ingredients'] != null) {
          final list = data['ingredients'] as List;
          _masterIngredientNames = list
              .map((item) => item['name']?.toString() ?? '')
              .where((name) => name.isNotEmpty)
              .toList();
        }
      }
    } catch (e) {
      debugPrint('Failed to load master ingredients: $e');
    }
  }

  /// Appends an empty row to the temporary manual input list.
  void addTempRow() {
    _tempIngredients.add(PantryIngredient(name: '', quantity: 1.0, unit: 'g'));
    notifyListeners();
  }

  /// Removes an ingredient row from the temporary manual list at a given index.
  void removeTempRow(int index) {
    if (index >= 0 && index < _tempIngredients.length) {
      _tempIngredients.removeAt(index);
      notifyListeners();
    }
  }

  /// Updates a specific ingredient row in the temporary manual list.
  void updateTempRow(int index, PantryIngredient updated) {
    if (index >= 0 && index < _tempIngredients.length) {
      _tempIngredients[index] = updated;
      notifyListeners();
    }
  }

  /// Saves the current manual form list to the user's virtual fridge on the backend.
  Future<void> savePantry() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final list = await _service.updatePantryManual(_tempIngredients);
      _ingredients = list;
      _tempIngredients = List.from(list);
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      _error = mapError(e).message;
      notifyListeners();
    }
  }

  /// Triggers the camera/gallery picker to capture a photo of the pantry,
  /// automatically compresses it, uploads it to be scanned, and populates
  /// the manual input form with results.
  Future<void> pickAndScanPantry(ImageSource source) async {
    if (source == ImageSource.camera && !supportsCameraSource) {
      _error = 'Device platform does not support direct camera capture.';
      notifyListeners();
      return;
    }

    _isLoading = true;
    _error = null;
    _scannedImagePath = null;
    notifyListeners();

    try {
      final pickedFile = await _picker.pickImage(
        source: source,
        maxWidth: 1600,
        maxHeight: 1600,
        imageQuality: 85, // 85% compression
      );

      if (pickedFile == null) {
        _isLoading = false;
        notifyListeners();
        return;
      }

      _scannedImagePath = pickedFile.path;
      notifyListeners();

      final scannedItems = await _service.scanPantryImage(pickedFile);

      // Overwrite manual form directly with scanned results so the user can verify them
      _tempIngredients = List.from(scannedItems);
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      _error = mapError(e).message;
      notifyListeners();
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  /// Resets the provider states upon logging out.
  void reset() {
    _isLoading = false;
    _error = null;
    _ingredients = [];
    _tempIngredients = [];
    _scannedImagePath = null;
    notifyListeners();
  }
}
