import '../repositories/recipe_repository.dart';

/// Get the current user's paginated reviews across all recipes.
class GetMyReviewsListUseCase {
  final RecipeRepository _repository;

  GetMyReviewsListUseCase(this._repository);

  Future<Map<String, dynamic>> call({int page = 1, int limit = 10, String sortOrder = 'desc'}) {
    return _repository.fetchAllMyReviews(page: page, limit: limit, sortOrder: sortOrder);
  }
}
