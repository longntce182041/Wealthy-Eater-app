import '../entities/recipe.dart';
import '../repositories/recipe_repository.dart';

/// Submit or update the current user's review for a recipe.
class UpsertRecipeReviewUseCase {
  final RecipeRepository repository;
  const UpsertRecipeReviewUseCase(this.repository);

  Future<RecipeReviewEntity> call({
    required String recipeId,
    required int rating,
    String comment = '',
  }) =>
      repository.upsertReview(
        recipeId: recipeId,
        rating: rating,
        comment: comment,
      );
}

/// Get paginated reviews for a recipe.
class GetRecipeReviewsUseCase {
  final RecipeRepository repository;
  const GetRecipeReviewsUseCase(this.repository);

  Future<Map<String, dynamic>> call(
    String recipeId, {
    int page = 1,
    int limit = 10,
    String sortOrder = 'desc',
  }) =>
      repository.fetchRecipeReviews(
        recipeId,
        page: page,
        limit: limit,
        sortOrder: sortOrder,
      );
}

/// Get the current user's review for a specific recipe (null if none).
class GetMyRecipeReviewUseCase {
  final RecipeRepository repository;
  const GetMyRecipeReviewUseCase(this.repository);

  Future<RecipeReviewEntity?> call(String recipeId) =>
      repository.fetchMyReview(recipeId);
}

/// Delete a review.
class DeleteRecipeReviewUseCase {
  final RecipeRepository repository;
  const DeleteRecipeReviewUseCase(this.repository);

  Future<void> call(String reviewId) => repository.deleteReview(reviewId);
}
