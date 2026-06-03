import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/recipe_provider.dart';
import 'recipe_detail_screen.dart';

class RecipeListView extends StatefulWidget {
  final EdgeInsetsGeometry padding;
  final bool showHeader;

  const RecipeListView({super.key, this.padding = const EdgeInsets.all(16), this.showHeader = false});

  @override
  State<RecipeListView> createState() => _RecipeListViewState();
}

class _RecipeListViewState extends State<RecipeListView> {
  final TextEditingController _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<RecipeProvider>(
      builder: (context, provider, _) {
        if (_searchController.text != provider.searchQuery) {
          _searchController.text = provider.searchQuery;
        }

        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (widget.showHeader) ...[
              Padding(
                padding: widget.padding,
                child: _Header(
                  title: 'Recipes',
                  subtitle: 'Search, filter, and refresh recipe data from the backend.',
                  onClear: provider.clearFilters,
                ),
              ),
            ],
            Expanded(
              child: RefreshIndicator(
                onRefresh: provider.refreshRecipes,
                child: ListView(
                  padding: widget.padding,
                  children: [
                    TextField(
                      controller: _searchController,
                      onChanged: provider.updateSearch,
                      decoration: const InputDecoration(
                        prefixIcon: Icon(Icons.search),
                        hintText: 'Search recipes, ingredients, or descriptions',
                      ),
                    ),
                    const SizedBox(height: 16),
                    Wrap(
                      spacing: 10,
                      runSpacing: 10,
                      children: [
                        _FilterChip(
                          label: 'All status',
                          selected: provider.selectedStatus.isEmpty,
                          onSelected: () => provider.updateStatusFilter(''),
                        ),
                        _FilterChip(
                          label: 'Published',
                          selected: provider.selectedStatus.toLowerCase() == 'published',
                          onSelected: () => provider.updateStatusFilter('Published'),
                        ),
                        _FilterChip(
                          label: 'Easy',
                          selected: provider.selectedDifficulty.toLowerCase() == 'easy',
                          onSelected: () => provider.updateDifficultyFilter('Easy'),
                        ),
                        _FilterChip(
                          label: 'Medium',
                          selected: provider.selectedDifficulty.toLowerCase() == 'medium',
                          onSelected: () => provider.updateDifficultyFilter('Medium'),
                        ),
                        _FilterChip(
                          label: 'Hard',
                          selected: provider.selectedDifficulty.toLowerCase() == 'hard',
                          onSelected: () => provider.updateDifficultyFilter('Hard'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    if (provider.listState == RecipeViewState.loading) ...[
                      const SizedBox(height: 120),
                      const Center(child: CircularProgressIndicator()),
                    ] else if (provider.listState == RecipeViewState.error) ...[
                      const SizedBox(height: 120),
                      _ErrorView(
                        message: provider.errorMessage ?? 'Unable to load recipes',
                        onRetry: provider.loadRecipes,
                      ),
                    ] else if (provider.recipes.isEmpty) ...[
                      const SizedBox(height: 120),
                      _EmptyView(onRefresh: provider.loadRecipes),
                    ] else ...[
                      ...provider.recipes.map(
                        (recipe) => Padding(
                          padding: const EdgeInsets.only(bottom: 14),
                          child: _RecipeCard(
                            recipe: recipe,
                            onTap: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (_) => RecipeDetailScreen(recipeId: recipe.id),
                                ),
                              );
                            },
                            isFavorite: recipe.isFavorite,
                            onFavoriteTap: () => provider.toggleFavorite(recipe),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

class _Header extends StatelessWidget {
  final String title;
  final String subtitle;
  final VoidCallback onClear;

  const _Header({required this.title, required this.subtitle, required this.onClear});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800)),
              const SizedBox(height: 6),
              Text(subtitle, style: Theme.of(context).textTheme.bodyMedium),
            ],
          ),
        ),
        IconButton(
          onPressed: onClear,
          icon: const Icon(Icons.clear_all),
          tooltip: 'Clear filters',
        ),
      ],
    );
  }
}

class _RecipeCard extends StatelessWidget {
  final dynamic recipe;
  final VoidCallback onTap;
  final VoidCallback onFavoriteTap;
  final bool isFavorite;

  const _RecipeCard({
    required this.recipe,
    required this.onTap,
    required this.onFavoriteTap,
    required this.isFavorite,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(24),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(20),
                child: Container(
                  width: 96,
                  height: 96,
                  color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.12),
                  child: recipe.imageUrl.isNotEmpty
                      ? Image.network(recipe.imageUrl, fit: BoxFit.cover)
                      : const Icon(Icons.fastfood, size: 42),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            recipe.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                          ),
                        ),
                        IconButton(
                          onPressed: onFavoriteTap,
                          icon: Icon(isFavorite ? Icons.favorite : Icons.favorite_border),
                          color: isFavorite ? Colors.redAccent : null,
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      recipe.description.isEmpty ? 'Fresh, balanced recipe built for healthier meals.' : recipe.description,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _MiniBadge(icon: Icons.schedule, label: '${recipe.cookingTime} min'),
                        _MiniBadge(icon: Icons.signal_cellular_alt, label: recipe.difficulty),
                        if (recipe.averageRating != null && recipe.averageRating! > 0)
                          _MiniBadge(icon: Icons.star, label: recipe.averageRating!.toStringAsFixed(1)),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MiniBadge extends StatelessWidget {
  final IconData icon;
  final String label;

  const _MiniBadge({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 15),
          const SizedBox(width: 5),
          Text(label, style: Theme.of(context).textTheme.labelMedium),
        ],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onSelected;

  const _FilterChip({required this.label, required this.selected, required this.onSelected});

  @override
  Widget build(BuildContext context) {
    return ChoiceChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) => onSelected(),
    );
  }
}

class _EmptyView extends StatelessWidget {
  final Future<void> Function() onRefresh;

  const _EmptyView({required this.onRefresh});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.menu_book_outlined, size: 56),
          const SizedBox(height: 12),
          Text('No recipes found', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          Text('Try another search or filter.', style: Theme.of(context).textTheme.bodyMedium),
          const SizedBox(height: 16),
          ElevatedButton(onPressed: onRefresh, child: const Text('Reload')),
        ],
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  final String message;
  final Future<void> Function() onRetry;

  const _ErrorView({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.cloud_off, size: 56),
          const SizedBox(height: 12),
          Text('Something went wrong', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          Text(message, textAlign: TextAlign.center),
          const SizedBox(height: 16),
          ElevatedButton(onPressed: onRetry, child: const Text('Retry')),
        ],
      ),
    );
  }
}