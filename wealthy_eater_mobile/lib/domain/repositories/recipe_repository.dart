import '../entities/recipe.dart';

/// Abstract contract for all recipe-related data operations.
/// The concrete implementation lives in data/repositories/recipe_repository_impl.dart.
abstract class RecipeRepository {
  // ── Browse ──────────────────────────────────────────────────────────────────

  Future<List<RecipeEntity>> fetchRecipes({
    String search,
    String status,
    String difficulty,
    int? minTime,
    int? maxTime,
    int? minCalories,
    int? maxCalories,
    String? sortBy,
  });

  Future<RecipeEntity> fetchRecipeDetail(String id);

  // ── Like / Favorite ─────────────────────────────────────────────────────────

  /// Toggle like for [recipeId]. Returns new [isLiked] state.
  Future<({bool isLiked, String action})> toggleLike(String recipeId);

  /// Get the current user's liked recipes (paginated).
  Future<Map<String, dynamic>> fetchLikedRecipes({int page, int limit});

  /// Check whether the current user likes [recipeId].
  Future<({bool isLiked, int likeCount})> fetchLikeStatus(String recipeId);

  // ── Reviews ─────────────────────────────────────────────────────────────────

  /// Submit or update the current user's review for [recipeId].
  Future<RecipeReviewEntity> upsertReview({
    required String recipeId,
    required int rating,
    String comment,
  });

  /// Get paginated reviews for [recipeId].
  Future<Map<String, dynamic>> fetchRecipeReviews(
    String recipeId, {
    int page,
    int limit,
    String sortOrder,
  });

  /// Get the current user's review for [recipeId] (null if none yet).
  Future<RecipeReviewEntity?> fetchMyReview(String recipeId);

  /// Delete the user's review by [reviewId].
  Future<void> deleteReview(String reviewId);

  /// Get all reviews made by the current user across all recipes (paginated).
  Future<Map<String, dynamic>> fetchAllMyReviews({int page, int limit, String sortOrder});
}