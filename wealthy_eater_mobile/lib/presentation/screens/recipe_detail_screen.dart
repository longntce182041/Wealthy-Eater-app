import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../domain/entities/recipe.dart';
import '../providers/recipe_provider.dart';
import '../providers/shopping_list_provider.dart';

/// Recipe detail screen with three tabs: Info, Reviews.
/// View is recorded automatically on open.
class RecipeDetailScreen extends StatefulWidget {
  final String recipeId;

  const RecipeDetailScreen({super.key, required this.recipeId});

  @override
  State<RecipeDetailScreen> createState() => _RecipeDetailScreenState();
}

class _RecipeDetailScreenState extends State<RecipeDetailScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<RecipeProvider>().loadRecipeDetail(widget.recipeId);
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Only rebuild the Scaffold layout when the top-level detail state changes.
    // Liking a recipe or adding a review will only trigger isolated widget rebuilds.
    return Selector<RecipeProvider, RecipeViewState>(
      selector: (context, provider) => provider.detailState,
      builder: (context, detailState, _) {
        final provider = context.read<RecipeProvider>();
        final recipe = provider.selectedRecipe;

        return Scaffold(
          body: NestedScrollView(
            headerSliverBuilder: (context, innerBoxIsScrolled) {
              return [
                // ── Hero App Bar ──────────────────────────────────────────────
                SliverAppBar(
                  pinned: true,
                  expandedHeight: 320,
                  foregroundColor: Colors.white,
                  backgroundColor: Theme.of(context).colorScheme.tertiary,
                  actions: [
                    if (recipe != null)
                      _LikeButton(recipeId: recipe.id),
                  ],
                  flexibleSpace: FlexibleSpaceBar(
                    background: _HeroBackground(recipe: recipe),
                  ),
                ),
                if (recipe != null)
                  SliverPersistentHeader(
                    pinned: true,
                    delegate: _TabBarDelegate(
                      TabBar(
                        controller: _tabController,
                        tabs: const [
                          Tab(text: 'Information'),
                          Tab(text: 'Reviews'),
                        ],
                      ),
                    ),
                  ),
              ];
            },
            body: _buildBodyContent(provider, recipe),
          ),
        );
      },
    );
  }

  Widget _buildBodyContent(RecipeProvider provider, RecipeEntity? recipe) {
    if (provider.detailState == RecipeViewState.loading) {
      return const Center(child: CircularProgressIndicator());
    } else if (provider.detailState == RecipeViewState.error) {
      return _DetailError(
        message: provider.errorMessage ?? 'Unable to load recipe',
        onRetry: () => provider.loadRecipeDetail(widget.recipeId),
      );
    } else if (recipe == null) {
      return const SizedBox.shrink();
    }

    return TabBarView(
      controller: _tabController,
      children: [
        _InfoTab(recipe: recipe),
        _ReviewsTab(
          recipeId: recipe.id,
        ),
      ],
    );
  }
}

// ─── Like button ──────────────────────────────────────────────────────────────

class _LikeButton extends StatelessWidget {
  final String recipeId;

  const _LikeButton({required this.recipeId});

  @override
  Widget build(BuildContext context) {
    return Consumer<RecipeProvider>(
      builder: (context, provider, _) {
        final isLiked = provider.selectedRecipe?.isLiked ?? false;
        
        return IconButton(
          tooltip: isLiked ? 'Unlike' : 'Like',
          icon: AnimatedSwitcher(
            duration: const Duration(milliseconds: 250),
            transitionBuilder: (child, animation) =>
                ScaleTransition(scale: animation, child: child),
            child: Icon(
              isLiked ? Icons.favorite : Icons.favorite_border,
              key: ValueKey(isLiked),
              color: isLiked ? Colors.redAccent : Colors.white,
            ),
          ),
          onPressed: () => provider.toggleLike(recipeId),
        );
      },
    );
  }
}

// ─── Hero background ──────────────────────────────────────────────────────────

class _HeroBackground extends StatelessWidget {
  final RecipeEntity? recipe;
  const _HeroBackground({this.recipe});

  @override
  Widget build(BuildContext context) {
    if (recipe == null) {
      return Container(
          color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.12));
    }
    return Stack(
      fit: StackFit.expand,
      children: [
        recipe!.imageUrl.isNotEmpty
            ? Image.network(recipe!.imageUrl, fit: BoxFit.cover)
            : Container(
                color: Theme.of(context)
                    .colorScheme
                    .primary
                    .withValues(alpha: 0.12)),
        // Top gradient
        Positioned(
          top: 0, left: 0, right: 0, height: 100,
          child: Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Colors.black.withValues(alpha: 0.5),
                  Colors.transparent
                ],
              ),
            ),
          ),
        ),
        // Bottom gradient + title
        Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                Colors.transparent,
                Colors.black.withValues(alpha: 0.72)
              ],
            ),
          ),
        ),
        Positioned(
          left: 20, right: 20, bottom: 22,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                recipe!.name,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      color: Colors.white, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  _Pill(label: '${recipe!.cookingTime} min', icon: Icons.schedule),
                  _Pill(label: recipe!.difficulty, icon: Icons.workspace_premium_outlined),
                  if (recipe!.averageRating != null && recipe!.averageRating! > 0)
                    _Pill(
                        label: '${recipe!.averageRating!.toStringAsFixed(1)} ★',
                        icon: Icons.star),
                  if (recipe!.likeCount > 0)
                    _Pill(
                        label: '${recipe!.likeCount} ♥',
                        icon: Icons.favorite_outline),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// INFO TAB
// ═══════════════════════════════════════════════════════════════════════════════

class _InfoTab extends StatelessWidget {
  final RecipeEntity recipe;
  const _InfoTab({required this.recipe});

  Future<void> _addToShoppingList(BuildContext context, int servings) async {
    final provider = context.read<ShoppingListProvider>();
    final ok = await provider.addFromRecipe(recipe.id, servings: servings);
    if (!context.mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.all(16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        backgroundColor: ok
            ? Colors.green.shade700
            : Theme.of(context).colorScheme.error,
        content: Row(
          children: [
            Icon(
              ok ? Icons.shopping_cart_checkout : Icons.error_outline,
              color: Colors.white,
              size: 18,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                ok
                    ? 'Ingredients added to your shopping list!'
                    : (provider.errorMessage ?? 'Failed to add ingredients'),
                style: const TextStyle(color: Colors.white),
              ),
            ),
          ],
        ),
        duration: const Duration(seconds: 3),
      ),
    );
  }

  void _showServingsSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => _ServingsSelectorSheet(
        baseServings: recipe.baseServings > 0 ? recipe.baseServings : 1,
        onConfirm: (servings) {
          Navigator.pop(context);
          _addToShoppingList(context, servings);
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        // Description
        _SectionTitle(title: 'Description'),
        const SizedBox(height: 8),
        Text(recipe.description.isEmpty
            ? 'No description available.'
            : recipe.description),
        const SizedBox(height: 20),

        // Ingredients + Add to Shopping List
        Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Expanded(child: _SectionTitle(title: 'Ingredients')),
            Consumer<ShoppingListProvider>(
              builder: (ctx, shoppingProvider, _) {
                final isAdding = shoppingProvider.isAdding;
                final isAdded = shoppingProvider.isRecipePending(recipe.id);
                return AnimatedSwitcher(
                  duration: const Duration(milliseconds: 200),
                  child: isAdding
                      ? const SizedBox(
                          key: ValueKey('loading'),
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(strokeWidth: 2.5),
                        )
                      : FilledButton.tonalIcon(
                          key: const ValueKey('button'),
                          onPressed: (recipe.ingredients.isEmpty || isAdded)
                              ? null
                              : () => _showServingsSheet(ctx),
                          icon: Icon(
                            isAdded ? Icons.check : Icons.add_shopping_cart_outlined,
                            size: 16,
                          ),
                          label: Text(isAdded ? 'Added to list' : 'Add to list'),
                          style: FilledButton.styleFrom(
                            visualDensity: VisualDensity.compact,
                            padding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 6),
                          ),
                        ),
                );
              },
            ),
          ],
        ),
        const SizedBox(height: 12),
        ...recipe.ingredients.map((ing) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: _IngredientTile(
                  ingredient: ing.name,
                  quantity: '${ing.quantity} ${ing.unit}'),
            )),

        const SizedBox(height: 20),

        // Steps
        _SectionTitle(title: 'Cooking steps'),
        const SizedBox(height: 12),
        ...recipe.steps.map((step) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _StepTile(
                  stepNumber: step.stepNumber,
                  instruction: step.instruction),
            )),

        const SizedBox(height: 20),

        // Nutrition
        _SectionTitle(title: 'Nutrition'),
        const SizedBox(height: 12),
        if (recipe.nutrition != null)
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              _NutritionChip(
                  label: 'Calories',
                  value: recipe.nutrition!.calories.toStringAsFixed(0)),
              _NutritionChip(
                  label: 'Protein',
                  value: '${recipe.nutrition!.protein.toStringAsFixed(1)} g'),
              _NutritionChip(
                  label: 'Carbs',
                  value: '${recipe.nutrition!.carbs.toStringAsFixed(1)} g'),
              _NutritionChip(
                  label: 'Fat',
                  value: '${recipe.nutrition!.fat.toStringAsFixed(1)} g'),
            ],
          )
        else
          const Text('Nutrition data is not available for this recipe.'),

        const SizedBox(height: 24),
      ],
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// REVIEWS TAB
// ═══════════════════════════════════════════════════════════════════════════════

class _ReviewsTab extends StatelessWidget {
  final String recipeId;

  const _ReviewsTab({required this.recipeId});

  @override
  Widget build(BuildContext context) {
    return Consumer<RecipeProvider>(
      builder: (context, provider, _) {
        final recipe = provider.selectedRecipe;
        if (recipe == null) return const SizedBox.shrink();

        void showReviewSheet() {
          showModalBottomSheet(
            context: context,
            isScrollControlled: true,
            backgroundColor: Colors.transparent,
            builder: (_) => _ReviewBottomSheet(
              recipe: recipe,
              existingReview: provider.myReviewForCurrentRecipe,
              onSubmit: (rating, comment) async {
                return provider.submitReview(
                  recipeId: recipe.id,
                  rating: rating,
                  comment: comment,
                );
              },
              onDelete: provider.myReviewForCurrentRecipe != null
                  ? () => provider.deleteMyReview(
                        provider.myReviewForCurrentRecipe!.id,
                        recipe.id,
                      )
                  : null,
            ),
          );
        }

        final stats = provider.reviewStats;
        final avg   = (stats['avgRating'] as num?)?.toDouble() ?? 0.0;
        final total = (stats['totalReviews'] as num?)?.toInt() ?? 0;

        return ListView(
          padding: const EdgeInsets.all(20),
          children: [
            // Stats header
            if (total > 0)
              _RatingHeader(avgRating: avg, totalReviews: total, stats: stats),

            const SizedBox(height: 16),

            // My review chip or Write review button
            _MyReviewPreview(
              myReview: provider.myReviewForCurrentRecipe,
              onTap: () => showReviewSheet(),
            ),

            const SizedBox(height: 16),

            // Reviews list
            if (provider.reviewsState == RecipeViewState.loading)
              const Center(child: Padding(
                padding: EdgeInsets.all(32),
                child: CircularProgressIndicator(),
              ))
            else if (provider.reviewsState == RecipeViewState.error)
              Padding(
                padding: const EdgeInsets.all(16),
                child: Text(provider.reviewsError ?? 'Unable to load reviews',
                    textAlign: TextAlign.center),
              )
            else if (provider.currentRecipeReviews.isEmpty)
              Center(
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 32),
                  child: Column(
                    children: [
                      const Icon(Icons.rate_review_outlined, size: 48),
                      const SizedBox(height: 8),
                      Text('No reviews yet',
                          style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: 4),
                      const Text('Be the first to share your experience!'),
                    ],
                  ),
                ),
              )
            else
              ...provider.currentRecipeReviews.map(
                (review) => Padding(
                  padding: const EdgeInsets.only(bottom: 14),
                  child: _ReviewCard(review: review),
                ),
              ),
          ],
        );
      },
    );
  }
}

// ─── Rating header ────────────────────────────────────────────────────────────

class _RatingHeader extends StatelessWidget {
  final double avgRating;
  final int totalReviews;
  final Map<String, dynamic> stats;

  const _RatingHeader({
    required this.avgRating,
    required this.totalReviews,
    required this.stats,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        children: [
          Column(
            children: [
              Text(
                avgRating.toStringAsFixed(1),
                style: Theme.of(context)
                    .textTheme
                    .displayMedium
                    ?.copyWith(fontWeight: FontWeight.w800),
              ),
              _StarRow(rating: avgRating, size: 18),
              const SizedBox(height: 4),
              Text('$totalReviews review${totalReviews != 1 ? 's' : ''}',
                  style: Theme.of(context).textTheme.bodySmall),
            ],
          ),
          const SizedBox(width: 20),
          // Distribution bars
          Expanded(
            child: Column(
              children: [5, 4, 3, 2, 1].map((star) {
                final dist = stats['distribution'];
                final pct  = dist is Map
                    ? (dist[star.toString()] as num?)?.toDouble() ?? 0.0
                    : 0.0;
                return _DistBar(star: star, percent: pct);
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }
}

class _DistBar extends StatelessWidget {
  final int star;
  final double percent;
  const _DistBar({required this.star, required this.percent});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          Text('$star', style: Theme.of(context).textTheme.labelSmall),
          const SizedBox(width: 6),
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: percent / 100,
                minHeight: 6,
                backgroundColor:
                    Theme.of(context).colorScheme.outline.withValues(alpha: 0.2),
              ),
            ),
          ),
          const SizedBox(width: 6),
          SizedBox(
            width: 36,
            child: Text('${percent.toStringAsFixed(0)}%',
                style: Theme.of(context).textTheme.labelSmall),
          ),
        ],
      ),
    );
  }
}

// ─── My review preview ────────────────────────────────────────────────────────

class _MyReviewPreview extends StatelessWidget {
  final RecipeReviewEntity? myReview;
  final VoidCallback onTap;

  const _MyReviewPreview({this.myReview, required this.onTap});

  @override
  Widget build(BuildContext context) {
    if (myReview != null) {
      return InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            border: Border.all(
                color: Theme.of(context).colorScheme.primary,
                width: 1.5),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Row(
            children: [
              _StarRow(rating: myReview!.rating.toDouble(), size: 18),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  myReview!.comment.isNotEmpty
                      ? myReview!.comment
                      : 'Tap to edit your review',
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const Icon(Icons.edit_outlined, size: 18),
            ],
          ),
        ),
      );
    }

    return FilledButton.icon(
      onPressed: onTap,
      icon: const Icon(Icons.star_outline),
      label: const Text('Write a review'),
    );
  }
}

// ─── Review card ──────────────────────────────────────────────────────────────

class _ReviewCard extends StatelessWidget {
  final RecipeReviewEntity review;
  const _ReviewCard({required this.review});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 16,
                child: Text(
                  review.userName.isNotEmpty
                      ? review.userName[0].toUpperCase()
                      : 'U',
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(review.userName,
                        style: Theme.of(context)
                            .textTheme
                            .titleSmall
                            ?.copyWith(fontWeight: FontWeight.w600)),
                    _StarRow(rating: review.rating.toDouble(), size: 14),
                  ],
                ),
              ),
              if (review.createdAt != null)
                Text(
                  _formatDate(review.createdAt!),
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: Theme.of(context).colorScheme.outline,
                      ),
                ),
            ],
          ),
          if (review.comment.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(review.comment),
          ],
        ],
      ),
    );
  }

  String _formatDate(DateTime dt) {
    final local = dt.toLocal();
    return '${local.day}/${local.month}/${local.year}';
  }
}

// ─── Review bottom sheet ──────────────────────────────────────────────────────

class _ReviewBottomSheet extends StatefulWidget {
  final RecipeEntity recipe;
  final RecipeReviewEntity? existingReview;
  final Future<bool> Function(int rating, String comment) onSubmit;
  final VoidCallback? onDelete;

  const _ReviewBottomSheet({
    required this.recipe,
    required this.onSubmit,
    this.existingReview,
    this.onDelete,
  });

  @override
  State<_ReviewBottomSheet> createState() => _ReviewBottomSheetState();
}

class _ReviewBottomSheetState extends State<_ReviewBottomSheet> {
  late int _rating;
  late final TextEditingController _commentCtrl;
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _rating      = widget.existingReview?.rating ?? 0;
    _commentCtrl = TextEditingController(
        text: widget.existingReview?.comment ?? '');
  }

  @override
  void dispose() {
    _commentCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_rating == 0) {
      setState(() => _error = 'Please select a star rating');
      return;
    }
    setState(() { _loading = true; _error = null; });

    final ok = await widget.onSubmit(_rating, _commentCtrl.text.trim());
    if (!mounted) return;

    if (ok) {
      Navigator.pop(context);
    } else {
      setState(() {
        _loading = false;
        _error   = 'Failed to submit review. Please try again.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Container(
        padding: const EdgeInsets.fromLTRB(24, 24, 24, 32),
        decoration: BoxDecoration(
          color: Theme.of(context).scaffoldBackgroundColor,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Handle
            Center(
              child: Container(
                width: 40, height: 4,
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.4),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 20),

            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  widget.existingReview != null
                      ? 'Edit your review'
                      : 'Write a review',
                  style: Theme.of(context)
                      .textTheme
                      .titleLarge
                      ?.copyWith(fontWeight: FontWeight.bold),
                ),
                if (widget.existingReview != null && widget.onDelete != null)
                  IconButton(
                    tooltip: 'Delete review',
                    icon: const Icon(Icons.delete_outline, color: Colors.red),
                    onPressed: () {
                      widget.onDelete!();
                      Navigator.pop(context);
                    },
                  ),
              ],
            ),

            const SizedBox(height: 4),
            Text(widget.recipe.name,
                style: Theme.of(context).textTheme.bodyMedium,
                maxLines: 1,
                overflow: TextOverflow.ellipsis),

            const SizedBox(height: 20),

            // Star selector
            Text('Your rating',
                style: Theme.of(context).textTheme.labelLarge),
            const SizedBox(height: 8),
            Row(
              children: List.generate(5, (i) {
                final star = i + 1;
                return GestureDetector(
                  onTap: () => setState(() => _rating = star),
                  child: Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: Icon(
                      star <= _rating ? Icons.star : Icons.star_border,
                      color: Colors.amber,
                      size: 36,
                    ),
                  ),
                );
              }),
            ),

            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(_error!,
                  style: TextStyle(
                      color: Theme.of(context).colorScheme.error,
                      fontSize: 12)),
            ],

            const SizedBox(height: 20),

            // Comment
            TextField(
              controller: _commentCtrl,
              maxLines: 4,
              decoration: const InputDecoration(
                hintText: 'Share your thoughts (optional)...',
                border: OutlineInputBorder(),
              ),
            ),

            const SizedBox(height: 24),

            FilledButton(
              onPressed: _loading ? null : _submit,
              child: _loading
                  ? const SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Text(
                      widget.existingReview != null
                          ? 'Update review'
                          : 'Submit review'),
            ),
          ],
        ),
      ),
    );
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// Shared sub-widgets
// ════════════════════════════════════════════════════════════════════════════════

class _StarRow extends StatelessWidget {
  final double rating;
  final double size;
  const _StarRow({required this.rating, required this.size});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(5, (i) {
        if (rating >= i + 1) {
          return Icon(Icons.star, color: Colors.amber, size: size);
        } else if (rating > i) {
          return Icon(Icons.star_half, color: Colors.amber, size: size);
        } else {
          return Icon(Icons.star_border, color: Colors.amber, size: size);
        }
      }),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String title;
  const _SectionTitle({required this.title});

  @override
  Widget build(BuildContext context) {
    return Text(title,
        style: Theme.of(context)
            .textTheme
            .titleLarge
            ?.copyWith(fontWeight: FontWeight.w700));
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
          Expanded(
              child: Text(ingredient,
                  style: const TextStyle(fontWeight: FontWeight.w600))),
          Text(quantity,
              style: Theme.of(context).textTheme.labelLarge),
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
          CircleAvatar(
              radius: 14,
              child: Text('$stepNumber',
                  style: const TextStyle(fontSize: 12))),
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
        color: Theme.of(context)
            .colorScheme
            .primary
            .withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: Theme.of(context).textTheme.labelMedium),
          const SizedBox(height: 4),
          Text(value,
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.w700)),
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

// ─── Persistent tab bar delegate ──────────────────────────────────────────────

class _TabBarDelegate extends SliverPersistentHeaderDelegate {
  final TabBar tabBar;
  const _TabBarDelegate(this.tabBar);

  @override
  double get minExtent => tabBar.preferredSize.height;

  @override
  double get maxExtent => tabBar.preferredSize.height;

  @override
  Widget build(
    BuildContext context,
    double shrinkOffset,
    bool overlapsContent,
  ) {
    return Material(
      elevation: overlapsContent ? 2 : 0,
      child: tabBar,
    );
  }

  @override
  bool shouldRebuild(_TabBarDelegate old) => tabBar != old.tabBar;
}

// ─── Detail error ─────────────────────────────────────────────────────────────

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
            ElevatedButton(
                onPressed: onRetry, child: const Text('Retry')),
          ],
        ),
      ),
    );
  }
}

// ─── Servings Selector Sheet ──────────────────────────────────────────────────

class _ServingsSelectorSheet extends StatefulWidget {
  final int baseServings;
  final void Function(int) onConfirm;

  const _ServingsSelectorSheet({
    required this.baseServings,
    required this.onConfirm,
  });

  @override
  State<_ServingsSelectorSheet> createState() => _ServingsSelectorSheetState();
}

class _ServingsSelectorSheetState extends State<_ServingsSelectorSheet> {
  late int _servings;

  @override
  void initState() {
    super.initState();
    _servings = widget.baseServings;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.fromLTRB(24, 24, 24, 32),
      decoration: BoxDecoration(
        color: theme.scaffoldBackgroundColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Handle
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: theme.colorScheme.outline.withValues(alpha: 0.4),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'Adjust Servings',
            style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text(
            'How many portions are you planning to cook?',
            style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 32),
          
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              IconButton.filledTonal(
                onPressed: _servings > 1 ? () => setState(() => _servings--) : null,
                icon: const Icon(Icons.remove),
                iconSize: 28,
              ),
              const SizedBox(width: 32),
              SizedBox(
                width: 40,
                child: Text(
                  '$_servings',
                  style: theme.textTheme.displaySmall?.copyWith(fontWeight: FontWeight.w600),
                  textAlign: TextAlign.center,
                ),
              ),
              const SizedBox(width: 32),
              IconButton.filledTonal(
                onPressed: _servings < 100 ? () => setState(() => _servings++) : null,
                icon: const Icon(Icons.add),
                iconSize: 28,
              ),
            ],
          ),
          const SizedBox(height: 40),
          
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: () => widget.onConfirm(_servings),
              style: FilledButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              child: Text(
                'Add $_servings serving${_servings == 1 ? '' : 's'} to list',
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
              ),
            ),
          ),
        ],
      ),
    );
  }
}