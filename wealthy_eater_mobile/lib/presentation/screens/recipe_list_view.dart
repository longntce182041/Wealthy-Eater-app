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
                      decoration: InputDecoration(
                        prefixIcon: const Icon(Icons.search),
                        suffixIcon: IconButton(
                          icon: const Icon(Icons.tune),
                          onPressed: () {
                            showModalBottomSheet(
                              context: context,
                              isScrollControlled: true,
                              backgroundColor: Colors.transparent,
                              builder: (context) => _RecipeFilterBottomSheet(provider: provider),
                            );
                          },
                        ),
                        hintText: 'Search recipes...',
                      ),
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
                            isLiked: recipe.isLiked,
                            onLikeTap: () => provider.toggleLike(recipe.id),
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
  final VoidCallback onLikeTap;
  final bool isLiked;

  const _RecipeCard({
    required this.recipe,
    required this.onTap,
    required this.onLikeTap,
    required this.isLiked,
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
                          onPressed: onLikeTap,
                          icon: Icon(isLiked ? Icons.favorite : Icons.favorite_border),
                          color: isLiked ? Colors.redAccent : null,
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

class _RecipeFilterBottomSheet extends StatefulWidget {
  final RecipeProvider provider;

  const _RecipeFilterBottomSheet({required this.provider});

  @override
  State<_RecipeFilterBottomSheet> createState() => _RecipeFilterBottomSheetState();
}

class _RecipeFilterBottomSheetState extends State<_RecipeFilterBottomSheet> {
  late String status;
  late String difficulty;
  late int? minTime;
  late int? maxTime;
  late int? minCalories;
  late int? maxCalories;
  late String sortBy;

  final minTimeController = TextEditingController();
  final maxTimeController = TextEditingController();
  final minCalController = TextEditingController();
  final maxCalController = TextEditingController();

  @override
  void initState() {
    super.initState();
    final p = widget.provider;
    status = p.selectedStatus;
    difficulty = p.selectedDifficulty;
    minTime = p.minTime;
    maxTime = p.maxTime;
    minCalories = p.minCalories;
    maxCalories = p.maxCalories;
    sortBy = p.sortBy ?? 'name_asc';

    if (minTime != null) minTimeController.text = minTime.toString();
    if (maxTime != null) maxTimeController.text = maxTime.toString();
    if (minCalories != null) minCalController.text = minCalories.toString();
    if (maxCalories != null) maxCalController.text = maxCalories.toString();
  }

  @override
  void dispose() {
    minTimeController.dispose();
    maxTimeController.dispose();
    minCalController.dispose();
    maxCalController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      decoration: BoxDecoration(
        color: Theme.of(context).scaffoldBackgroundColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Filters & Sort', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const SizedBox(height: 20),
            
            // Sort
            Text('Sort By', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              children: [
                ChoiceChip(label: const Text('A-Z'), selected: sortBy == 'name_asc', onSelected: (v) => setState(() => sortBy = 'name_asc')),
                ChoiceChip(label: const Text('Z-A'), selected: sortBy == 'name_desc', onSelected: (v) => setState(() => sortBy = 'name_desc')),
                ChoiceChip(label: const Text('Time (Fast)'), selected: sortBy == 'time_asc', onSelected: (v) => setState(() => sortBy = 'time_asc')),
                ChoiceChip(label: const Text('Time (Slow)'), selected: sortBy == 'time_desc', onSelected: (v) => setState(() => sortBy = 'time_desc')),
                ChoiceChip(label: const Text('Newest'), selected: sortBy == 'newest', onSelected: (v) => setState(() => sortBy = 'newest')),
              ],
            ),
            const SizedBox(height: 20),

            // Status
            Text('Status', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              children: [
                ChoiceChip(label: const Text('All'), selected: status == '', onSelected: (v) => setState(() => status = '')),
                ChoiceChip(label: const Text('Published'), selected: status.toLowerCase() == 'published', onSelected: (v) => setState(() => status = 'Published')),
                ChoiceChip(label: const Text('Draft'), selected: status.toLowerCase() == 'draft', onSelected: (v) => setState(() => status = 'Draft')),
              ],
            ),
            const SizedBox(height: 20),

            // Difficulty
            Text('Difficulty', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              children: [
                ChoiceChip(label: const Text('All'), selected: difficulty == '', onSelected: (v) => setState(() => difficulty = '')),
                ChoiceChip(label: const Text('Easy'), selected: difficulty.toLowerCase() == 'easy', onSelected: (v) => setState(() => difficulty = 'Easy')),
                ChoiceChip(label: const Text('Medium'), selected: difficulty.toLowerCase() == 'medium', onSelected: (v) => setState(() => difficulty = 'Medium')),
                ChoiceChip(label: const Text('Hard'), selected: difficulty.toLowerCase() == 'hard', onSelected: (v) => setState(() => difficulty = 'Hard')),
              ],
            ),
            const SizedBox(height: 20),

            // Time
            Text('Cooking Time (mins)', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(child: TextField(controller: minTimeController, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Min', isDense: true))),
                const SizedBox(width: 16),
                Expanded(child: TextField(controller: maxTimeController, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Max', isDense: true))),
              ],
            ),
            const SizedBox(height: 20),

            // Calories
            Text('Calories (kcal)', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(child: TextField(controller: minCalController, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Min', isDense: true))),
                const SizedBox(width: 16),
                Expanded(child: TextField(controller: maxCalController, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Max', isDense: true))),
              ],
            ),
            const SizedBox(height: 32),

            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () {
                      widget.provider.clearFilters();
                      Navigator.pop(context);
                    },
                    child: const Text('Clear All'),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () {
                      widget.provider.applyAdvancedFilters(
                        status: status,
                        difficulty: difficulty,
                        newMinTime: int.tryParse(minTimeController.text),
                        newMaxTime: int.tryParse(maxTimeController.text),
                        newMinCalories: int.tryParse(minCalController.text),
                        newMaxCalories: int.tryParse(maxCalController.text),
                        newSortBy: sortBy,
                      );
                      Navigator.pop(context);
                    },
                    child: const Text('Apply'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}