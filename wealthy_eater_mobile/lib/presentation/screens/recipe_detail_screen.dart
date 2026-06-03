import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/recipe_provider.dart';

class RecipeDetailScreen extends StatefulWidget {
  final String recipeId;

  const RecipeDetailScreen({super.key, required this.recipeId});

  @override
  State<RecipeDetailScreen> createState() => _RecipeDetailScreenState();
}

class _RecipeDetailScreenState extends State<RecipeDetailScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<RecipeProvider>().loadRecipeDetail(widget.recipeId);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<RecipeProvider>(
      builder: (context, provider, _) {
        final recipe = provider.selectedRecipe;

        return Scaffold(
          body: CustomScrollView(
            slivers: [
              SliverAppBar(
                pinned: true,
                expandedHeight: 320,
                title: const Text('Recipe detail'),
                flexibleSpace: FlexibleSpaceBar(
                  background: recipe == null
                      ? Container(color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.12))
                      : Stack(
                          fit: StackFit.expand,
                          children: [
                            recipe.imageUrl.isNotEmpty
                                ? Image.network(recipe.imageUrl, fit: BoxFit.cover)
                                : Container(color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.12)),
                            Container(
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  begin: Alignment.topCenter,
                                  end: Alignment.bottomCenter,
                                  colors: [Colors.transparent, Colors.black.withValues(alpha: 0.72)],
                                ),
                              ),
                            ),
                            Positioned(
                              left: 20,
                              right: 20,
                              bottom: 22,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    recipe.name,
                                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(color: Colors.white, fontWeight: FontWeight.w700),
                                  ),
                                  const SizedBox(height: 8),
                                  Wrap(
                                    spacing: 10,
                                    runSpacing: 10,
                                    children: [
                                      _Pill(label: '${recipe.cookingTime} min', icon: Icons.schedule),
                                      _Pill(label: recipe.difficulty, icon: Icons.workspace_premium_outlined),
                                      if (recipe.averageRating != null && recipe.averageRating! > 0) _Pill(label: '${recipe.averageRating!.toStringAsFixed(1)} ★', icon: Icons.star),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                ),
              ),
              if (provider.detailState == RecipeViewState.loading)
                const SliverFillRemaining(
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (provider.detailState == RecipeViewState.error)
                SliverFillRemaining(
                  child: _DetailError(
                    message: provider.errorMessage ?? 'Unable to load recipe detail',
                    onRetry: () => provider.loadRecipeDetail(widget.recipeId),
                  ),
                )
              else if (recipe == null)
                const SliverFillRemaining(
                  child: SizedBox.shrink(),
                )
              else
                SliverList(
                  delegate: SliverChildListDelegate(
                    [
                      Padding(
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Description', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
                            const SizedBox(height: 8),
                            Text(recipe.description.isEmpty ? 'No description available.' : recipe.description),
                            const SizedBox(height: 20),
                            _SectionTitle(title: 'Ingredients'),
                            const SizedBox(height: 12),
                            ...recipe.ingredients.map(
                              (ingredient) => Padding(
                                padding: const EdgeInsets.only(bottom: 10),
                                child: _IngredientTile(ingredient: ingredient.name, quantity: '${ingredient.quantity} ${ingredient.unit}'),
                              ),
                            ),
                            const SizedBox(height: 20),
                            _SectionTitle(title: 'Cooking steps'),
                            const SizedBox(height: 12),
                            ...recipe.steps.map(
                              (step) => Padding(
                                padding: const EdgeInsets.only(bottom: 12),
                                child: _StepTile(stepNumber: step.stepNumber, instruction: step.instruction),
                              ),
                            ),
                            const SizedBox(height: 20),
                            _SectionTitle(title: 'Nutrition'),
                            const SizedBox(height: 12),
                            if (recipe.nutrition != null)
                              Wrap(
                                spacing: 12,
                                runSpacing: 12,
                                children: [
                                  _NutritionChip(label: 'Calories', value: recipe.nutrition!.calories.toStringAsFixed(0)),
                                  _NutritionChip(label: 'Protein', value: '${recipe.nutrition!.protein.toStringAsFixed(1)} g'),
                                  _NutritionChip(label: 'Carbs', value: '${recipe.nutrition!.carbs.toStringAsFixed(1)} g'),
                                  _NutritionChip(label: 'Fat', value: '${recipe.nutrition!.fat.toStringAsFixed(1)} g'),
                                ],
                              )
                            else
                              const Text('Nutrition data is not available for this recipe.'),
                            const SizedBox(height: 20),
                            ElevatedButton.icon(
                              onPressed: () => provider.toggleFavorite(recipe),
                              icon: Icon(recipe.isFavorite ? Icons.favorite : Icons.favorite_border),
                              label: Text(recipe.isFavorite ? 'Added to favorites' : 'Add to favorites'),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String title;

  const _SectionTitle({required this.title});

  @override
  Widget build(BuildContext context) {
    return Text(title, style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700));
  }
}

class _IngredientTile extends StatelessWidget {
  final String ingredient;
  final String quantity;

  const _IngredientTile({required this.ingredient, required this.quantity});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        children: [
          const Icon(Icons.check_circle_outline),
          const SizedBox(width: 12),
          Expanded(child: Text(ingredient, style: const TextStyle(fontWeight: FontWeight.w600))),
          Text(quantity, style: Theme.of(context).textTheme.labelLarge),
        ],
      ),
    );
  }
}

class _StepTile extends StatelessWidget {
  final int stepNumber;
  final String instruction;

  const _StepTile({required this.stepNumber, required this.instruction});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(radius: 14, child: Text('$stepNumber', style: const TextStyle(fontSize: 12))),
          const SizedBox(width: 12),
          Expanded(child: Text(instruction)),
        ],
      ),
    );
  }
}

class _NutritionChip extends StatelessWidget {
  final String label;
  final String value;

  const _NutritionChip({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: Theme.of(context).textTheme.labelMedium),
          const SizedBox(height: 4),
          Text(value, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }
}

class _Pill extends StatelessWidget {
  final String label;
  final IconData icon;

  const _Pill({required this.label, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.16),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: Colors.white, size: 15),
          const SizedBox(width: 6),
          Text(label, style: const TextStyle(color: Colors.white)),
        ],
      ),
    );
  }
}

class _DetailError extends StatelessWidget {
  final String message;
  final Future<void> Function() onRetry;

  const _DetailError({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 56),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            ElevatedButton(onPressed: onRetry, child: const Text('Retry')),
          ],
        ),
      ),
    );
  }
}