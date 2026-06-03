// ignore_for_file: use_null_aware_elements, unnecessary_underscores

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../domain/entities/user.dart';
import '../providers/recipe_provider.dart';
import 'recipe_detail_screen.dart';

class DashboardHomeTab extends StatelessWidget {
  final UserEntity? user;
  final VoidCallback onExploreRecipes;

  const DashboardHomeTab({super.key, this.user, required this.onExploreRecipes});

  @override
  Widget build(BuildContext context) {
    final displayName = user?.fullName ?? 'User';

    return Consumer<RecipeProvider>(
      builder: (context, recipeProvider, _) {
        final featuredRecipes = recipeProvider.recipes.take(3).toList();

        return ListView(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
          children: [
            _HeroCard(name: displayName),
            const SizedBox(height: 20),

            // Stats row
            Row(
              children: [
                Expanded(
                  child: _MetricCard(
                    label: 'Recipes',
                    value: recipeProvider.recipes.length.toString(),
                    icon: Icons.menu_book,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _MetricCard(
                    label: 'Favorites',
                    value: recipeProvider.favoriteRecipeIds.length.toString(),
                    icon: Icons.favorite,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // Quick Actions
            _SectionCard(
              title: 'Quick actions',
              child: Wrap(
                spacing: 12,
                runSpacing: 12,
                children: [
                  FilledButton.icon(
                    onPressed: onExploreRecipes,
                    icon: const Icon(Icons.restaurant_menu),
                    label: const Text('Browse recipes'),
                  ),
                  OutlinedButton.icon(
                    onPressed: recipeProvider.refreshRecipes,
                    icon: const Icon(Icons.refresh),
                    label: const Text('Refresh'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Featured Recipes
            _SectionCard(
              title: 'Featured recipes',
              trailing: TextButton(onPressed: onExploreRecipes, child: const Text('See all')),
              child: featuredRecipes.isEmpty
                  ? Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Text(
                        'No recipes loaded yet.',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.grey.shade500),
                      ),
                    )
                  : Column(
                      children: featuredRecipes.map((recipe) {
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: Material(
                            color: Colors.transparent,
                            borderRadius: BorderRadius.circular(16),
                            child: InkWell(
                              borderRadius: BorderRadius.circular(16),
                              onTap: () => Navigator.of(context).push(
                                MaterialPageRoute(builder: (_) => RecipeDetailScreen(recipeId: recipe.id)),
                              ),
                              child: Row(
                                children: [
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(14),
                                    child: Container(
                                      width: 72,
                                      height: 72,
                                      color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.12),
                                      child: recipe.imageUrl.isNotEmpty
                                          ? Image.network(recipe.imageUrl, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const Icon(Icons.fastfood))
                                          : const Icon(Icons.fastfood, size: 32),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          recipe.name,
                                          style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          '${recipe.cookingTime} min · ${recipe.difficulty}',
                                          style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey.shade500),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const Icon(Icons.chevron_right, color: Colors.grey),
                                ],
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
            ),
          ],
        );
      },
    );
  }
}

class _HeroCard extends StatelessWidget {
  final String name;

  const _HeroCard({required this.name});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Theme.of(context).colorScheme.primary, Theme.of(context).colorScheme.tertiary],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(28),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Welcome back 👋',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.white.withValues(alpha: 0.85)),
          ),
          const SizedBox(height: 6),
          Text(
            name,
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(color: Colors.white, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 10),
          Text(
            'Discover healthy recipes and build better eating habits.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.white.withValues(alpha: 0.85)),
          ),
        ],
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;

  const _MetricCard({required this.label, required this.value, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            CircleAvatar(
              backgroundColor: Theme.of(context).colorScheme.primary.withValues(alpha: 0.12),
              child: Icon(icon, color: Theme.of(context).colorScheme.primary),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(value, style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
                  Text(label, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey.shade500)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  final String title;
  final Widget child;
  final Widget? trailing;

  const _SectionCard({required this.title, required this.child, this.trailing});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(title, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                ),
                if (trailing != null) trailing!,
              ],
            ),
            const SizedBox(height: 14),
            child,
          ],
        ),
      ),
    );
  }
}