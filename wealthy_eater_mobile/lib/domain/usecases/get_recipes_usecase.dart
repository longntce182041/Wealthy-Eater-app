import '../entities/recipe.dart';
import '../repositories/recipe_repository.dart';

class GetRecipesUseCase {
  final RecipeRepository repository;

  GetRecipesUseCase(this.repository);

  Future<List<RecipeEntity>> call({
    String search = '',
    String status = '',
    String difficulty = '',
    int? minTime,
    int? maxTime,
    int? minCalories,
    int? maxCalories,
    String? sortBy,
  }) {
    return repository.fetchRecipes(
      search: search,
      status: status,
      difficulty: difficulty,
      minTime: minTime,
      maxTime: maxTime,
      minCalories: minCalories,
      maxCalories: maxCalories,
      sortBy: sortBy,
    );
  }
}