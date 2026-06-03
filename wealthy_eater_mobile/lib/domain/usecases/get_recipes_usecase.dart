import '../entities/recipe.dart';
import '../repositories/recipe_repository.dart';

class GetRecipesUseCase {
  final RecipeRepository repository;

  GetRecipesUseCase(this.repository);

  Future<List<RecipeEntity>> call({
    String search = '',
    String status = '',
    String difficulty = '',
  }) {
    return repository.fetchRecipes(
      search: search,
      status: status,
      difficulty: difficulty,
    );
  }
}