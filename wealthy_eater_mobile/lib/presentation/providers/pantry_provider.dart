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
  List<Map<String, dynamic>> _masterIngredients = [];
  String? _scannedImagePath;

  bool _isLoadingSuggestions = false;
  List<Map<String, dynamic>> _suggestedRecipes = [];
  String _lastSuggestedPantryHash = '';

  // Track which recipes are currently being saved to prevent spam clicking
  final Set<String> _savingAiRecipes = {};

  bool _isLoadingSavedAiRecipes = false;
  List<Map<String, dynamic>> _savedAiRecipes = [];

  // ── Getters ────────────────────────────────────────────────────────────────
  bool get isLoading => _isLoading;
  String? get error => _error;
  List<PantryIngredient> get ingredients => _ingredients;
  List<PantryIngredient> get tempIngredients => _tempIngredients;
  List<String> get masterIngredientNames => _masterIngredientNames;
  List<Map<String, dynamic>> get masterIngredients => _masterIngredients;
  String? get scannedImagePath => _scannedImagePath;

  bool get isLoadingSuggestions => _isLoadingSuggestions;
  List<Map<String, dynamic>> get suggestedRecipes => _suggestedRecipes;

  bool get isLoadingSavedAiRecipes => _isLoadingSavedAiRecipes;
  List<Map<String, dynamic>> get savedAiRecipes => _savedAiRecipes;

  bool get isPantryChangedSinceLastSuggestion {
    final currentHash = _ingredients.map((e) => '${e.name}:${e.quantity}:${e.unit}').join('|');
    return currentHash != _lastSuggestedPantryHash;
  }

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

  /// Fetches master ingredients list to feed into the manual input autocomplete field and ingredient picker grid.
  Future<void> loadMasterIngredients() async {
    try {
      final response = await _apiClient.get('/api/profile/setup-metadata');
      if (response.statusCode == 200 && response.data['success'] == true) {
        final data = response.data['data'];
        if (data != null && data['ingredients'] != null) {
          final list = data['ingredients'] as List;
          _masterIngredients = list.map((item) {
            return {
              'id': item['_id']?.toString() ?? '',
              'name': item['name']?.toString() ?? '',
              'image_url': item['image_url']?.toString() ?? '',
            };
          }).where((item) => (item['name'] as String).isNotEmpty).toList();

          _masterIngredientNames = _masterIngredients.map((e) => e['name'] as String).toList();
        }
      }
    } catch (e) {
      debugPrint('Failed to load master ingredients: $e');
    }
  }

  /// Adds an ingredient directly from the ingredient picker grid.
  void addIngredientFromPicker(String name, {double defaultQuantity = 100.0, String defaultUnit = 'g'}) {
    final trimmedName = name.trim();
    if (trimmedName.isEmpty) return;
    
    // Check if already in temp list
    final exists = _tempIngredients.any(
      (item) => item.name.trim().toLowerCase() == trimmedName.toLowerCase(),
    );
    if (!exists) {
      _tempIngredients.add(PantryIngredient(name: trimmedName, quantity: defaultQuantity, unit: defaultUnit));
      notifyListeners();
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

  /// Converts a list of ingredient name strings (from scanner) into PantryIngredient
  /// objects and sets them as the current temporary list ready for [savePantry].
  void setTempIngredientsFromNames(List<String> names) {
    _tempIngredients = names
        .map((n) => PantryIngredient(name: n.trim(), quantity: 1.0, unit: 'units'))
        .where((i) => i.name.isNotEmpty)
        .toList();
    notifyListeners();
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

  /// Suggests meals based on current pantry items.
  Future<void> suggestMeals() async {
    // Guard: prevent duplicate concurrent requests when user taps Refresh rapidly
    if (_isLoadingSuggestions) return;

    _isLoadingSuggestions = true;
    _error = null;
    _suggestedRecipes = [];
    notifyListeners();

    try {
      final recipes = await _service.suggestRecipesFromPantry();
      _suggestedRecipes = recipes;
      _lastSuggestedPantryHash = _ingredients.map((e) => '${e.name}:${e.quantity}:${e.unit}').join('|');
      _isLoadingSuggestions = false;
      notifyListeners();
      
      // Fetch saved AI recipes in the background to correctly check isAiRecipeSaved
      fetchSavedAiRecipes();
    } catch (e) {
      _isLoadingSuggestions = false;
      _error = mapError(e).message;
      notifyListeners();
    }
  }

  /// Fetches saved AI recipes from the backend
  Future<void> fetchSavedAiRecipes() async {
    _isLoadingSavedAiRecipes = true;
    notifyListeners();

    try {
      final recipes = await _service.getSavedAiRecipes();
      _savedAiRecipes = recipes;
      _isLoadingSavedAiRecipes = false;
      notifyListeners();
    } catch (e) {
      _isLoadingSavedAiRecipes = false;
      // Do not overwrite main error, just log it or handle silently
      debugPrint('Failed to load saved AI recipes: $e');
      notifyListeners();
    }
  }

  /// Saves an AI recipe to the backend
  Future<bool> saveAiRecipe(Map<String, dynamic> recipe) async {
    final mealName = recipe['mealName'] as String?;
    if (mealName == null || _savingAiRecipes.contains(mealName)) return false;

    _savingAiRecipes.add(mealName);
    notifyListeners();

    try {
      await _service.saveAiRecipe(recipe);
      await fetchSavedAiRecipes();
      _savingAiRecipes.remove(mealName);
      return true;
    } catch (e) {
      _savingAiRecipes.remove(mealName);
      _error = mapError(e).message;
      notifyListeners();
      return false;
    }
  }

  /// Deletes a saved AI recipe
  Future<bool> deleteAiRecipe(String recipeId) async {
    // Optimistic UI Update: remove it from local state immediately
    final index = _savedAiRecipes.indexWhere((r) => r['_id'] == recipeId);
    Map<String, dynamic>? backup;
    if (index != -1) {
      backup = _savedAiRecipes[index];
      _savedAiRecipes.removeAt(index);
      notifyListeners();
    }

    try {
      await _service.deleteAiRecipe(recipeId);
      return true;
    } catch (e) {
      // Revert if failed
      if (backup != null && index != -1) {
        _savedAiRecipes.insert(index, backup);
      }
      _error = mapError(e).message;
      notifyListeners();
      return false;
    }
  }

  /// Checks if a recipe is already saved based on its mealName
  bool isAiRecipeSaved(String mealName) {
    return _savedAiRecipes.any((r) => r['mealName'] == mealName);
  }

  /// Checks if a recipe is currently being saved
  bool isSavingAiRecipe(String mealName) {
    return _savingAiRecipes.contains(mealName);
  }

  /// Resets the provider states upon logging out.
  void reset() {
    _isLoading = false;
    _error = null;
    _ingredients = [];
    _tempIngredients = [];
    _scannedImagePath = null;
    _isLoadingSuggestions = false;
    _suggestedRecipes = [];
    _lastSuggestedPantryHash = '';
    _isLoadingSavedAiRecipes = false;
    _savedAiRecipes = [];
    notifyListeners();
  }
}
