/// meal_image_scan_provider.dart — State management for meal scanning via camera/gallery.
library;

import 'package:flutter/foundation.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/error/app_error.dart';
import '../../core/network/api_client.dart';
import '../../data/models/meal_image_scan_model.dart';
import '../../data/services/meal_image_scan_service.dart';

class MealImageScanProvider extends ChangeNotifier {
  final MealImageScanService _service;
  final ImagePicker _picker = ImagePicker();

  MealImageScanProvider({required ApiClient api})
      : _service = MealImageScanService(apiClient: api);

  // ── State ──────────────────────────────────────────────────────────────────
  bool _isLoading = false;
  String? _error;
  MealImageScanResult? _result;
  String? _imagePath;

  // ── Getters ────────────────────────────────────────────────────────────────
  bool get isLoading => _isLoading;
  String? get error => _error;
  MealImageScanResult? get result => _result;
  String? get imagePath => _imagePath;
  bool get hasResult => _result != null;

  /// Check whether camera is supported (Web is not supported for native picker camera source)
  bool get supportsCameraSource {
    if (kIsWeb) return false;
    final platform = defaultTargetPlatform;
    return platform == TargetPlatform.android || platform == TargetPlatform.iOS;
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  /// Prompts the picker to select an image from Camera or Gallery, compresses it, 
  /// and sends it to the backend for analysis.
  Future<void> pickAndScan(ImageSource source) async {
    if (source == ImageSource.camera && !supportsCameraSource) {
      _error = 'Thiết bị hoặc nền tảng không hỗ trợ chụp ảnh trực tiếp.';
      notifyListeners();
      return;
    }

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      // Pick & automatically compress in-memory / on-disk using ImagePicker options
      final pickedFile = await _picker.pickImage(
        source: source,
        maxWidth: 1600,
        maxHeight: 1600,
        imageQuality: 85, // 85% compression preserves visual details while saving space
      );

      if (pickedFile == null) {
        _isLoading = false;
        notifyListeners();
        return;
      }

      _imagePath = pickedFile.path;
      notifyListeners();

      // Trigger service API
      final analysis = await _service.scanMealImage(file: pickedFile);

      _result = analysis;
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      _error = mapError(e).message;
      notifyListeners();
    }
  }

  /// Resets the provider state
  void clear() {
    _isLoading = false;
    _error = null;
    _result = null;
    _imagePath = null;
    notifyListeners();
  }

  /// Logs the matched scanned recipe to the user's daily meal log.
  Future<bool> logScannedMeal(double weightGram) async {
    if (_result == null || _result!.recipeId == null) return false;
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _service.logCustomRecipe(
        recipeId: _result!.recipeId!,
        weightGram: weightGram,
      );
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _isLoading = false;
      _error = mapError(e).message;
      notifyListeners();
      return false;
    }
  }
}
