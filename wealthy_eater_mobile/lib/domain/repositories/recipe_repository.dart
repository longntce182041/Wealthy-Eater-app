import '../entities/recipe.dart';

abstract class RecipeRepository {
  Future<List<RecipeEntity>> fetchRecipes({
    String search,
    String status,
    String difficulty,
  });

  Future<RecipeEntity> fetchRecipeDetail(String id);
}