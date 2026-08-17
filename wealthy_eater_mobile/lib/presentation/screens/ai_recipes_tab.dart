import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_colors.dart';
import '../providers/pantry_provider.dart';

class AiRecipesTab extends StatefulWidget {
  const AiRecipesTab({super.key});

  @override
  State<AiRecipesTab> createState() => _AiRecipesTabState();
}

class _AiRecipesTabState extends State<AiRecipesTab>
    with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<PantryProvider>().fetchSavedAiRecipes();
    });
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return Consumer<PantryProvider>(
      builder: (context, provider, _) {
        if (provider.isLoadingSavedAiRecipes && provider.savedAiRecipes.isEmpty) {
          return const Center(child: CircularProgressIndicator(color: AppColors.primary));
        }

        if (provider.savedAiRecipes.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 72,
                  height: 72,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: AppColors.primaryLight.withValues(alpha: 0.5),
                  ),
                  child: const Icon(Icons.bookmark_outline_rounded,
                      size: 36, color: AppColors.primary),
                ),
                const SizedBox(height: 16),
                const Text(
                  'No AI Recipes Saved',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Go to the Pantry to generate and save meals.',
                  style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
                ),
              ],
            ),
          );
        }

        return RefreshIndicator(
          onRefresh: provider.fetchSavedAiRecipes,
          color: AppColors.primary,
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: provider.savedAiRecipes.length,
            itemBuilder: (context, index) {
              final recipe = provider.savedAiRecipes[index];
              return _AiRecipeCard(recipe: recipe);
            },
          ),
        );
      },
    );
  }
}

class _AiRecipeCard extends StatelessWidget {
  final Map<String, dynamic> recipe;

  const _AiRecipeCard({required this.recipe});

  @override
  Widget build(BuildContext context) {
    final mealName = recipe['mealName'] as String? ?? 'Unknown Recipe';
    final description = recipe['description'] as String? ?? '';
    final difficulty = recipe['difficulty'] as String? ?? 'Medium';
    final cookingTime = recipe['cookingTimeMinutes'] as int? ?? 0;
    final steps = recipe['cookingSteps'] as List? ?? [];
    final healthNote = recipe['healthNote'] as String?;

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: const BorderSide(color: AppColors.border),
      ),
      elevation: 0,
      color: AppColors.surface,
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Header row ──────────────────────────────────────────────────
            Row(
              children: [
                const Icon(Icons.restaurant_rounded,
                    color: AppColors.primary, size: 22),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    mealName,
                    style: const TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.delete_outline_rounded),
                  color: AppColors.error,
                  tooltip: 'Delete Saved Recipe',
                  onPressed: () => _confirmDelete(context, recipe),
                ),
              ],
            ),

            // ── Description ─────────────────────────────────────────────────
            if (description.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                description,
                style: const TextStyle(
                  fontSize: 13.5,
                  color: AppColors.textSecondary,
                  height: 1.5,
                ),
              ),
            ],

            // ── Meta chips ──────────────────────────────────────────────────
            const SizedBox(height: 14),
            Row(
              children: [
                _MetaChip(
                  icon: Icons.timer_outlined,
                  label: '$cookingTime min',
                  bgColor: AppColors.primaryLight,
                  textColor: AppColors.primaryDark,
                  iconColor: AppColors.primaryDark,
                ),
                const SizedBox(width: 8),
                _MetaChip(
                  icon: Icons.star_rounded,
                  label: difficulty,
                  bgColor: const Color(0xFFFFF3DC),
                  textColor: AppColors.secondary,
                  iconColor: AppColors.secondary,
                ),
              ],
            ),

            // ── Health Note ─────────────────────────────────────────────────
            if (healthNote != null && healthNote.isNotEmpty) ...[
              const SizedBox(height: 14),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(
                    horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: AppColors.primaryLight.withValues(alpha: 0.6),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: AppColors.primary.withValues(alpha: 0.25),
                  ),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.health_and_safety_outlined,
                        size: 16, color: AppColors.primary),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        healthNote,
                        style: const TextStyle(
                          fontSize: 12.5,
                          color: AppColors.primaryDark,
                          height: 1.45,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            // ── Cooking Steps ────────────────────────────────────────────────
            const Divider(height: 28, color: AppColors.divider),
            const Text(
              'Cooking Steps',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 14.5,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 10),
            ...steps.asMap().entries.map((entry) {
              final idx = entry.key + 1;
              final raw = entry.value;
              final String stepText = raw is Map
                  ? (raw['instruction'] ?? raw.toString())
                  : raw.toString();
              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 24,
                      height: 24,
                      decoration: const BoxDecoration(
                        color: AppColors.primaryLight,
                        shape: BoxShape.circle,
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        '$idx',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primaryDark,
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        stepText,
                        style: const TextStyle(
                          fontSize: 13.5,
                          color: AppColors.textSecondary,
                          height: 1.45,
                        ),
                      ),
                    ),
                  ],
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  void _confirmDelete(BuildContext context, Map<String, dynamic> recipe) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Recipe'),
        content: Text('Are you sure you want to remove "${recipe['mealName']}" from your saved list?'),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.error,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            onPressed: () async {
              Navigator.pop(ctx);
              final provider = context.read<PantryProvider>();
              final success = await provider.deleteAiRecipe(recipe['_id']);
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(success ? 'Recipe deleted' : (provider.error ?? 'Failed to delete')),
                    backgroundColor: success ? AppColors.success : AppColors.error,
                    behavior: SnackBarBehavior.floating,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                );
              }
            },
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }
}

/// Reusable chip for metadata display
class _MetaChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color bgColor;
  final Color textColor;
  final Color iconColor;

  const _MetaChip({
    required this.icon,
    required this.label,
    required this.bgColor,
    required this.textColor,
    required this.iconColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: iconColor),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: textColor,
            ),
          ),
        ],
      ),
    );
  }
}
