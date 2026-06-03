import '../entities/recipe.dart';
import '../repositories/recipe_repository.dart';

class GetRecipeDetailUseCase {
  final RecipeRepository repository;

  GetRecipeDetailUseCase(this.repository);

  Future<RecipeEntity> call(String id) {
    return repository.fetchRecipeDetail(id);
  }
}