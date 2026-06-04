import '../repositories/recipe_repository.dart';

/// Toggle like for a recipe.
/// Returns a record: (isLiked, action)
class ToggleRecipeLikeUseCase {
  final RecipeRepository repository;
  const ToggleRecipeLikeUseCase(this.repository);

  Future<({bool isLiked, String action})> call(String recipeId) =>
      repository.toggleLike(recipeId);
}

/// Fetch the current user's liked recipes (paginated).
class GetLikedRecipesUseCase {
  final RecipeRepository repository;
  const GetLikedRecipesUseCase(this.repository);

  Future<Map<String, dynamic>> call({int page = 1, int limit = 20}) =>
      repository.fetchLikedRecipes(page: page, limit: limit);
}

/// Fetch like status (isLiked + likeCount) for a single recipe.
class GetLikeStatusUseCase {
  final RecipeRepository repository;
  const GetLikeStatusUseCase(this.repository);

  Future<({bool isLiked, int likeCount})> call(String recipeId) =>
      repository.fetchLikeStatus(recipeId);
}
