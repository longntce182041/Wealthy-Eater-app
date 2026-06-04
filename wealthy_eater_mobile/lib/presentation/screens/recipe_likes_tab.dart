// ignore_for_file: unnecessary_underscores

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/recipe_provider.dart';
import 'recipe_detail_screen.dart';

/// Displays the current user's liked (favorited) recipes.
/// Loaded lazily when the user first switches to this tab.
class RecipeLikesTab extends StatefulWidget {
  const RecipeLikesTab({super.key});

  @override
  State<RecipeLikesTab> createState() => _RecipeLikesTabState();
}

class _RecipeLikesTabState extends State<RecipeLikesTab>
    with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<RecipeProvider>().loadLikedRecipes();
    });
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return Consumer<RecipeProvider>(
      builder: (context, provider, _) {
        if (provider.likedListState == RecipeViewState.loading) {
          return const Center(child: CircularProgressIndicator());
        }

        if (provider.likedListState == RecipeViewState.error) {
          return _ErrorView(
            message: provider.errorMessage ?? 'Failed to load liked recipes',
            onRetry: provider.loadLikedRecipes,
          );
        }

        if (provider.likedItems.isEmpty) {
          return _EmptyLikes(onBrowse: () {});
        }

        return RefreshIndicator(
          onRefresh: provider.loadLikedRecipes,
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: provider.likedItems.length,
            itemBuilder: (context, index) {
              final item   = provider.likedItems[index];
              final recipe = item['recipe'] as Map<String, dynamic>? ?? {};
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: _LikedRecipeCard(
                  recipe:  recipe,
                  onTap: () {
                    final id = recipe['_id']?.toString() ?? recipe['id']?.toString() ?? '';
                    if (id.isNotEmpty) {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => RecipeDetailScreen(recipeId: id),
                        ),
                      );
                    }
                  },
                  onUnlikeTap: () {
                    final id = recipe['_id']?.toString() ?? recipe['id']?.toString() ?? '';
                    if (id.isNotEmpty) {
                      provider.toggleLike(id);
                    }
                  },
                ),
              );
            },
          ),
        );
      },
    );
  }
}

// ─── Liked recipe card ────────────────────────────────────────────────────────

class _LikedRecipeCard extends StatelessWidget {
  final Map<String, dynamic> recipe;
  final VoidCallback onTap;
  final VoidCallback onUnlikeTap;

  const _LikedRecipeCard({
    required this.recipe,
    required this.onTap,
    required this.onUnlikeTap,
  });

  @override
  Widget build(BuildContext context) {
    final name        = recipe['name']?.toString() ?? 'Recipe';
    final description = recipe['description']?.toString() ?? '';
    final imageUrl    = recipe['image_url']?.toString() ?? recipe['imageUrl']?.toString() ?? '';
    final cookTime    = recipe['cooking_time'] ?? recipe['cookingTime'] ?? 0;
    final level       = recipe['level_cooking']?.toString() ?? recipe['difficulty']?.toString() ?? '';

    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(24),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Thumbnail
              ClipRRect(
                borderRadius: BorderRadius.circular(18),
                child: Container(
                  width: 90,
                  height: 90,
                  color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.1),
                  child: imageUrl.isNotEmpty
                      ? Image.network(imageUrl, fit: BoxFit.cover,
                          errorBuilder: (_, __, _) => const Icon(Icons.fastfood, size: 40))
                      : const Icon(Icons.fastfood, size: 40),
                ),
              ),
              const SizedBox(width: 14),
              // Info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context)
                                .textTheme
                                .titleMedium
                                ?.copyWith(fontWeight: FontWeight.w700),
                          ),
                        ),
                        IconButton(
                          onPressed: onUnlikeTap,
                          icon: const Icon(Icons.favorite, color: Colors.redAccent, size: 22),
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                        ),
                      ],
                    ),
                    if (description.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        description,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      children: [
                        if (cookTime > 0)
                          _Badge(icon: Icons.schedule, label: '$cookTime min'),
                        if (level.isNotEmpty)
                          _Badge(icon: Icons.signal_cellular_alt, label: level),
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

class _Badge extends StatelessWidget {
  final IconData icon;
  final String label;

  const _Badge({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13),
          const SizedBox(width: 4),
          Text(label, style: Theme.of(context).textTheme.labelSmall),
        ],
      ),
    );
  }
}

// ─── Empty state ──────────────────────────────────────────────────────────────

class _EmptyLikes extends StatelessWidget {
  final VoidCallback onBrowse;
  const _EmptyLikes({required this.onBrowse});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.favorite_border,
              size: 64,
              color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.4)),
          const SizedBox(height: 16),
          Text('No liked recipes yet',
              style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          Text('Tap the ♡ on any recipe to save it here.',
              style: Theme.of(context).textTheme.bodyMedium,
              textAlign: TextAlign.center),
        ],
      ),
    );
  }
}

// ─── Error state ──────────────────────────────────────────────────────────────

class _ErrorView extends StatelessWidget {
  final String message;
  final Future<void> Function() onRetry;

  const _ErrorView({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.cloud_off, size: 56),
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
