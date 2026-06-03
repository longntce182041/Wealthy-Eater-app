import '../entities/recipe.dart';

abstract class RecipeRepository {
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
}