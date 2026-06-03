import 'package:flutter/foundation.dart';

import '../../domain/entities/recipe.dart';
import '../../domain/usecases/get_recipe_detail_usecase.dart';
import '../../domain/usecases/get_recipes_usecase.dart';

enum RecipeViewState { initial, loading, success, error }

class RecipeProvider extends ChangeNotifier {
  final GetRecipesUseCase getRecipesUseCase;
  final GetRecipeDetailUseCase getRecipeDetailUseCase;

  RecipeProvider({
    required this.getRecipesUseCase,
    required this.getRecipeDetailUseCase,
  });

  RecipeViewState listState = RecipeViewState.initial;
  RecipeViewState detailState = RecipeViewState.initial;
  String? errorMessage;
  String searchQuery = '';
  String selectedStatus = '';
  String selectedDifficulty = '';

  List<RecipeEntity> recipes = const [];
  RecipeEntity? selectedRecipe;
  final Set<String> favoriteRecipeIds = {};

  Future<void> loadRecipes({bool silent = false}) async {
    if (!silent) {
      listState = RecipeViewState.loading;
      errorMessage = null;
      notifyListeners();
    }

    try {
      recipes = await getRecipesUseCase(
        search: searchQuery,
        status: selectedStatus,
        difficulty: selectedDifficulty,
      );
      recipes = recipes.map((recipe) => recipe.copyWith(isFavorite: favoriteRecipeIds.contains(recipe.id))).toList();
      listState = RecipeViewState.success;
    } catch (error) {
      listState = RecipeViewState.error;
      errorMessage = error.toString();
    }
    notifyListeners();
  }

  Future<void> loadRecipeDetail(String id) async {
    detailState = RecipeViewState.loading;
    errorMessage = null;
    notifyListeners();

    try {
      selectedRecipe = await getRecipeDetailUseCase(id);
      selectedRecipe = selectedRecipe?.copyWith(isFavorite: favoriteRecipeIds.contains(id));
      detailState = RecipeViewState.success;
    } catch (error) {
      detailState = RecipeViewState.error;
      errorMessage = error.toString();
    }
    notifyListeners();
  }

  Future<void> refreshRecipes() => loadRecipes(silent: true);

  void updateSearch(String value) {
    searchQuery = value;
    loadRecipes();
  }

  void updateStatusFilter(String value) {
    selectedStatus = value;
    loadRecipes();
  }

  void updateDifficultyFilter(String value) {
    selectedDifficulty = value;
    loadRecipes();
  }

  void clearFilters() {
    searchQuery = '';
    selectedStatus = '';
    selectedDifficulty = '';
    loadRecipes();
  }

  void toggleFavorite(RecipeEntity recipe) {
    if (favoriteRecipeIds.contains(recipe.id)) {
      favoriteRecipeIds.remove(recipe.id);
    } else {
      favoriteRecipeIds.add(recipe.id);
    }

    if (selectedRecipe != null && selectedRecipe!.id == recipe.id) {
      selectedRecipe = selectedRecipe!.copyWith(isFavorite: favoriteRecipeIds.contains(recipe.id));
    }

    recipes = recipes.map((item) {
      if (item.id != recipe.id) return item;
      return item.copyWith(isFavorite: favoriteRecipeIds.contains(recipe.id));
    }).toList();

    notifyListeners();
  }
}