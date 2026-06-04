// ignore_for_file: unnecessary_underscores

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/recipe_provider.dart';
import 'recipe_detail_screen.dart';

/// Displays the current user's past reviews for recipes.
/// Loaded lazily when the user first switches to this tab.
class RecipeMyReviewsTab extends StatefulWidget {
  const RecipeMyReviewsTab({super.key});

  @override
  State<RecipeMyReviewsTab> createState() => _RecipeMyReviewsTabState();
}

class _RecipeMyReviewsTabState extends State<RecipeMyReviewsTab>
    with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<RecipeProvider>().loadMyReviewsList();
    });
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return Consumer<RecipeProvider>(
      builder: (context, provider, _) {
        if (provider.myReviewsListState == RecipeViewState.loading) {
          return const Center(child: CircularProgressIndicator());
        }

        if (provider.myReviewsListState == RecipeViewState.error) {
          return _ErrorView(
            message: provider.errorMessage ?? 'Failed to load reviews',
            onRetry: provider.loadMyReviewsList,
          );
        }

        if (provider.myReviewsItems.isEmpty) {
          return const _EmptyReviews();
        }

        return RefreshIndicator(
          onRefresh: provider.loadMyReviewsList,
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: provider.myReviewsItems.length,
            itemBuilder: (context, index) {
              final reviewData = provider.myReviewsItems[index];
              final recipe     = reviewData['recipe_id'] as Map<String, dynamic>? ?? {};
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: _MyReviewCard(
                  review: reviewData,
                  recipe: recipe,
                ),
              );
            },
          ),
        );
      },
    );
  }
}

class _MyReviewCard extends StatelessWidget {
  final Map<String, dynamic> review;
  final Map<String, dynamic> recipe;

  const _MyReviewCard({required this.review, required this.recipe});

  @override
  Widget build(BuildContext context) {
    final recipeId     = recipe['_id']?.toString() ?? '';
    final name         = recipe['name']?.toString() ?? 'Unknown Recipe';
    final imageUrl     = recipe['image_url']?.toString() ?? '';
    final cookTime     = recipe['cooking_time'] ?? recipe['cookingTime'] ?? 0;
    final level        = recipe['level_cooking']?.toString() ?? recipe['difficulty']?.toString() ?? '';

    final rating       = (review['rating'] as num?)?.toInt() ?? 0;
    final comment      = review['comment']?.toString() ?? '';
    
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(24),
        onTap: recipeId.isEmpty
            ? null
            : () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => RecipeDetailScreen(recipeId: recipeId),
                  ),
                );
              },
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
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: List.generate(5, (index) {
                            return Icon(
                              index < rating ? Icons.star : Icons.star_border,
                              color: Colors.amber,
                              size: 14,
                            );
                          }),
                        ),
                      ],
                    ),
                    if (comment.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        comment,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(fontStyle: FontStyle.italic),
                      ),
                    ],
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      children: [
                        if (cookTime is num && cookTime > 0)
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

class _EmptyReviews extends StatelessWidget {
  const _EmptyReviews();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.rate_review_outlined, size: 64, color: Colors.grey[400]),
          const SizedBox(height: 16),
          Text(
            'No reviews yet',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  color: Colors.grey[600],
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            'Recipes you review will appear here.',
            style: TextStyle(color: Colors.grey[500]),
          ),
        ],
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _ErrorView({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 56, color: Colors.redAccent),
            const SizedBox(height: 16),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Try Again'),
            ),
          ],
        ),
      ),
    );
  }
}
