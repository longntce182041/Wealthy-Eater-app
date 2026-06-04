import 'package:flutter/foundation.dart';

import '../../domain/entities/recipe.dart';
import '../../domain/usecases/get_recipe_detail_usecase.dart';
import '../../domain/usecases/get_recipes_usecase.dart';
import '../../domain/usecases/recipe_like_usecases.dart';
import '../../domain/usecases/recipe_review_usecases.dart';
import '../../domain/usecases/get_my_reviews_list_usecase.dart';

enum RecipeViewState { initial, loading, success, error }

class RecipeProvider extends ChangeNotifier {
  // ── Use Cases ──────────────────────────────────────────────────────────────

  final GetRecipesUseCase getRecipesUseCase;
  final GetRecipeDetailUseCase getRecipeDetailUseCase;

  // Likes
  final ToggleRecipeLikeUseCase toggleRecipeLikeUseCase;
  final GetLikedRecipesUseCase getLikedRecipesUseCase;
  final GetLikeStatusUseCase getLikeStatusUseCase;

  // Reviews
  final UpsertRecipeReviewUseCase upsertReviewUseCase;
  final GetRecipeReviewsUseCase getRecipeReviewsUseCase;
  final GetMyRecipeReviewUseCase getMyReviewUseCase;
  final DeleteRecipeReviewUseCase deleteReviewUseCase;

  // My Reviews tab
  final GetMyReviewsListUseCase getMyReviewsListUseCase;

  RecipeProvider({
    required this.getRecipesUseCase,
    required this.getRecipeDetailUseCase,
    required this.toggleRecipeLikeUseCase,
    required this.getLikedRecipesUseCase,
    required this.getLikeStatusUseCase,
    required this.upsertReviewUseCase,
    required this.getRecipeReviewsUseCase,
    required this.getMyReviewUseCase,
    required this.deleteReviewUseCase,
    required this.getMyReviewsListUseCase,
  });

  // ── Browse state ───────────────────────────────────────────────────────────

  RecipeViewState listState   = RecipeViewState.initial;
  RecipeViewState detailState = RecipeViewState.initial;
  String? errorMessage;

  String searchQuery        = '';
  String selectedStatus     = '';
  String selectedDifficulty = '';
  int? minTime;
  int? maxTime;
  int? minCalories;
  int? maxCalories;
  String? sortBy = 'name_asc';

  List<RecipeEntity> recipes = const [];
  RecipeEntity? selectedRecipe;

  // ── Like state ─────────────────────────────────────────────────────────────

  RecipeViewState likedListState = RecipeViewState.initial;

  /// Raw JSON items from the "liked" endpoint (each has a `recipe` sub-object).
  List<dynamic> likedItems = const [];
  Map<String, dynamic> likedMeta = const {};

  /// IDs of recipes the user has liked (server-confirmed — kept in sync).
  final Set<String> _likedRecipeIds = {};

  // ── Review state ───────────────────────────────────────────────────────────

  RecipeViewState reviewsState = RecipeViewState.initial;
  String? reviewsError;
  List<RecipeReviewEntity> currentRecipeReviews = const [];
  Map<String, dynamic> reviewStats = const {};
  RecipeReviewEntity? myReviewForCurrentRecipe;

  bool isSubmittingReview = false;
  String? reviewSubmitError;

  // ── My Reviews list state ──────────────────────────────────────────────────

  RecipeViewState myReviewsListState = RecipeViewState.initial;
  List<dynamic> myReviewsItems = const [];
  Map<String, dynamic> myReviewsMeta = const {};

  // ════════════════════════════════════════════════════════════════════════════
  // BROWSE
  // ════════════════════════════════════════════════════════════════════════════

  Future<void> loadRecipes({bool silent = false}) async {
    if (!silent) {
      listState    = RecipeViewState.loading;
      errorMessage = null;
      notifyListeners();
    }

    try {
      recipes = await getRecipesUseCase(
        search:      searchQuery,
        status:      selectedStatus,
        difficulty:  selectedDifficulty,
        minTime:     minTime,
        maxTime:     maxTime,
        minCalories: minCalories,
        maxCalories: maxCalories,
        sortBy:      sortBy,
      );

      // Sync local like state from server-confirmed set
      recipes = recipes.map((r) => r.copyWith(isLiked: _likedRecipeIds.contains(r.id))).toList();
      listState = RecipeViewState.success;
    } catch (e) {
      listState    = RecipeViewState.error;
      errorMessage = e.toString();
    }
    notifyListeners();
  }

  Future<void> loadRecipeDetail(String id) async {
    detailState  = RecipeViewState.loading;
    errorMessage = null;
    notifyListeners();

    try {
      selectedRecipe = await getRecipeDetailUseCase(id);
      selectedRecipe = selectedRecipe?.copyWith(
        isLiked: _likedRecipeIds.contains(id),
      );
      detailState = RecipeViewState.success;

      // Side-effects: fetch like status + fetch reviews
      _syncLikeStatus(id);
      loadRecipeReviews(id);
      loadMyReview(id);
    } catch (e) {
      detailState  = RecipeViewState.error;
      errorMessage = e.toString();
    }
    notifyListeners();
  }

  Future<void> refreshRecipes() => loadRecipes(silent: true);

  void updateSearch(String value) {
    searchQuery = value;
    loadRecipes();
  }

  void applyAdvancedFilters({
    String? status,
    String? difficulty,
    int? newMinTime,
    int? newMaxTime,
    int? newMinCalories,
    int? newMaxCalories,
    String? newSortBy,
  }) {
    if (status != null)     selectedStatus     = status;
    if (difficulty != null) selectedDifficulty = difficulty;
    minTime     = newMinTime;
    maxTime     = newMaxTime;
    minCalories = newMinCalories;
    maxCalories = newMaxCalories;
    if (newSortBy != null) sortBy = newSortBy;
    loadRecipes();
  }

  void updateStatusFilter(String value)     { selectedStatus     = value; loadRecipes(); }
  void updateDifficultyFilter(String value) { selectedDifficulty = value; loadRecipes(); }

  void clearFilters() {
    searchQuery = '';
    selectedStatus = '';
    selectedDifficulty = '';
    minTime = maxTime = minCalories = maxCalories = null;
    sortBy = 'name_asc';
    loadRecipes();
  }

  // ════════════════════════════════════════════════════════════════════════════
  // LIKES
  // ════════════════════════════════════════════════════════════════════════════

  /// Toggle like and immediately update UI, then confirm from server.
  Future<void> toggleLike(String recipeId) async {
    // Save snapshot for rollback
    final previousLikedItems = List<dynamic>.from(likedItems);

    // Optimistic update
    final wasLiked = _likedRecipeIds.contains(recipeId);
    if (wasLiked) {
      _likedRecipeIds.remove(recipeId);
      likedItems = likedItems.where((item) {
        final r = item['recipe'] as Map<String, dynamic>? ?? {};
        final id = r['_id']?.toString() ?? r['id']?.toString() ?? '';
        return id != recipeId;
      }).toList();
    } else {
      _likedRecipeIds.add(recipeId);
    }
    _syncLikedStateToLists(recipeId, !wasLiked);
    notifyListeners();

    try {
      final result = await toggleRecipeLikeUseCase(recipeId);
      // Reconcile with server truth
      if (result.isLiked) {
        _likedRecipeIds.add(recipeId);
        // Only fetch list on 'add' to get the populated recipe data
        loadLikedRecipes();
      } else {
        _likedRecipeIds.remove(recipeId);
      }
      _syncLikedStateToLists(recipeId, result.isLiked);
      notifyListeners();
    } catch (_) {
      // Roll back on failure
      if (wasLiked) {
        _likedRecipeIds.add(recipeId);
      } else {
        _likedRecipeIds.remove(recipeId);
      }
      likedItems = previousLikedItems; // Restore snapshot
      _syncLikedStateToLists(recipeId, wasLiked);
      notifyListeners();
    }
  }

  void _syncLikedStateToLists(String recipeId, bool isLiked) {
    recipes = recipes.map((r) {
      return r.id == recipeId ? r.copyWith(isLiked: isLiked) : r;
    }).toList();

    if (selectedRecipe?.id == recipeId) {
      selectedRecipe = selectedRecipe!.copyWith(isLiked: isLiked);
    }
  }

  Future<void> _syncLikeStatus(String recipeId) async {
    try {
      final status = await getLikeStatusUseCase(recipeId);
      if (status.isLiked) {
        _likedRecipeIds.add(recipeId);
      } else {
        _likedRecipeIds.remove(recipeId);
      }
      _syncLikedStateToLists(recipeId, status.isLiked);

      // Update like count on detail
      if (selectedRecipe?.id == recipeId) {
        selectedRecipe = selectedRecipe!.copyWith(likeCount: status.likeCount);
      }
      notifyListeners();
    } catch (_) {
      // Non-critical: leave state as-is
    }
  }

  Future<void> loadLikedRecipes({int page = 1}) async {
    likedListState = RecipeViewState.loading;
    notifyListeners();

    try {
      final result = await getLikedRecipesUseCase(page: page, limit: 20);
      likedItems     = result['items'] as List? ?? [];
      likedMeta      = result['meta']  as Map<String, dynamic>? ?? {};

      // Update known liked IDs
      for (final item in likedItems) {
        final recipe = item['recipe'];
        if (recipe is Map && recipe['_id'] != null) {
          _likedRecipeIds.add(recipe['_id'].toString());
        }
      }

      likedListState = RecipeViewState.success;
    } catch (e) {
      likedListState = RecipeViewState.error;
      errorMessage   = e.toString();
    }
    notifyListeners();
  }

  // ════════════════════════════════════════════════════════════════════════════
  // REVIEWS
  // ════════════════════════════════════════════════════════════════════════════

  Future<void> loadRecipeReviews(String recipeId, {int page = 1}) async {
    reviewsState = RecipeViewState.loading;
    reviewsError = null;
    notifyListeners();

    try {
      final result = await getRecipeReviewsUseCase(recipeId, page: page, limit: 10);
      currentRecipeReviews = List<RecipeReviewEntity>.from(result['reviews'] as List? ?? []);
      reviewStats          = result['stats']   as Map<String, dynamic>? ?? {};
      
      // Update the average rating on the selected recipe so the top UI header updates real-time
      if (selectedRecipe?.id == recipeId) {
        final avgRating = (reviewStats['avgRating'] as num?)?.toDouble();
        final reviewCount = (reviewStats['totalReviews'] as num?)?.toInt();
        selectedRecipe = selectedRecipe!.copyWith(
          averageRating: avgRating,
          reviewCount: reviewCount,
        );
        
        // Sync updated rating to the main recipe list
        recipes = recipes.map((r) => r.id == recipeId ? selectedRecipe! : r).toList();
      }

      reviewsState         = RecipeViewState.success;
    } catch (e) {
      reviewsState = RecipeViewState.error;
      reviewsError = e.toString();
    }
    notifyListeners();
  }

  Future<void> loadMyReview(String recipeId) async {
    try {
      myReviewForCurrentRecipe = await getMyReviewUseCase(recipeId);
    } catch (_) {
      myReviewForCurrentRecipe = null;
    }
    notifyListeners();
  }

  Future<bool> submitReview({
    required String recipeId,
    required int rating,
    String comment = '',
  }) async {
    isSubmittingReview = true;
    reviewSubmitError  = null;
    notifyListeners();

    try {
      final review = await upsertReviewUseCase(
        recipeId: recipeId,
        rating:   rating,
        comment:  comment,
      );
      myReviewForCurrentRecipe = review;

      // Refresh the reviews list and update the detail's averageRating
      await loadRecipeReviews(recipeId);

      // Optimistically update My Reviews tab
      if (selectedRecipe != null && selectedRecipe!.id == recipeId) {
        final reviewMap = {
          '_id': review.id,
          'rating': rating,
          'comment': comment,
          'recipe_id': {
            '_id': selectedRecipe!.id,
            'name': selectedRecipe!.name,
            'image_url': selectedRecipe!.imageUrl,
            'cooking_time': selectedRecipe!.cookingTime,
            'level_cooking': selectedRecipe!.difficulty,
          }
        };
        myReviewsItems.removeWhere((item) {
          final r = item['recipe_id'] as Map<String, dynamic>? ?? {};
          return (r['_id'] ?? '') == recipeId;
        });
        myReviewsItems.insert(0, reviewMap);
      } else {
        loadMyReviewsList();
      }

      isSubmittingReview = false;
      notifyListeners();
      return true;
    } catch (e) {
      isSubmittingReview = false;
      reviewSubmitError  = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<void> deleteMyReview(String reviewId, String recipeId) async {
    try {
      await deleteReviewUseCase(reviewId);
      myReviewForCurrentRecipe = null;
      await loadRecipeReviews(recipeId);
      
      // Optimistically remove from My Reviews tab
      myReviewsItems.removeWhere((item) => (item['_id'] ?? '') == reviewId);
    } catch (_) {}
    notifyListeners();
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MY REVIEWS
  // ════════════════════════════════════════════════════════════════════════════

  Future<void> loadMyReviewsList({int page = 1}) async {
    myReviewsListState = RecipeViewState.loading;
    notifyListeners();

    try {
      final result = await getMyReviewsListUseCase(page: page, limit: 20);
      myReviewsItems     = result['items'] as List? ?? [];
      myReviewsMeta      = result['meta']  as Map<String, dynamic>? ?? {};
      myReviewsListState = RecipeViewState.success;
    } catch (e) {
      myReviewsListState = RecipeViewState.error;
      errorMessage       = e.toString();
    }
    notifyListeners();
  }
}