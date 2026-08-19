import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../providers/pantry_provider.dart';

class PantrySuggestionsScreen extends StatelessWidget {
  const PantrySuggestionsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<PantryProvider>();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        title: const Text(
          'AI Meal Suggestions',
          style: TextStyle(
            color: AppColors.textPrimary,
            fontWeight: FontWeight.w600,
            fontSize: 17,
          ),
        ),
        centerTitle: true,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(height: 1, color: AppColors.border),
        ),
        actions: [
          provider.isLoadingSuggestions
              ? const Padding(
                  padding: EdgeInsets.all(14),
                  child: SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: AppColors.primary,
                    ),
                  ),
                )
              : IconButton(
                  icon: const Icon(Icons.refresh_rounded,
                      color: AppColors.textSecondary),
                  tooltip: 'Suggest another recipe',
                  onPressed: () => provider.suggestMeals(),
                ),
        ],
      ),
      body: _buildBody(context, provider),
    );
  }

  Widget _buildBody(BuildContext context, PantryProvider provider) {
    if (provider.isLoadingSuggestions) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.primaryLight,
              ),
              child: const Padding(
                padding: EdgeInsets.all(16),
                child: CircularProgressIndicator(
                  color: AppColors.primary,
                  strokeWidth: 2.5,
                ),
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              'Analyzing your pantry...',
              style: TextStyle(
                color: AppColors.textPrimary,
                fontWeight: FontWeight.w600,
                fontSize: 16,
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'Checking allergies, medical condition & goals',
              style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
            ),
          ],
        ),
      );
    }

    // ── Error State ─────────────────────────────────────────────────────────
    if (provider.error != null && provider.suggestedRecipes.isEmpty) {
      final isAllergyError = provider.error
              ?.toLowerCase()
              .contains('allerg') ??
          false;

      return Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: isAllergyError
                      ? AppColors.warning.withValues(alpha: 0.12)
                      : AppColors.error.withValues(alpha: 0.1),
                ),
                child: Icon(
                  isAllergyError
                      ? Icons.no_food_outlined
                      : Icons.cloud_off_outlined,
                  size: 36,
                  color: isAllergyError ? AppColors.warning : AppColors.error,
                ),
              ),
              const SizedBox(height: 18),
              Text(
                isAllergyError
                    ? 'Pantry Conflict Detected'
                    : 'Unable to Generate Suggestions',
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                  color: AppColors.textPrimary,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 10),
              Text(
                provider.error!,
                style: const TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 13,
                  height: 1.55,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: () {
                  if (isAllergyError) {
                    Navigator.of(context).pop(); // Back to pantry to fix
                  } else {
                    provider.suggestMeals();
                  }
                },
                icon: Icon(
                    isAllergyError ? Icons.arrow_back : Icons.refresh_rounded),
                label: Text(isAllergyError ? 'Back to Pantry' : 'Try Again'),
                style: ElevatedButton.styleFrom(
                  backgroundColor:
                      isAllergyError ? AppColors.warning : AppColors.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  padding: const EdgeInsets.symmetric(
                      horizontal: 24, vertical: 12),
                ),
              ),
            ],
          ),
        ),
      );
    }

    // ── Empty State ──────────────────────────────────────────────────────────
    final recipes = provider.suggestedRecipes;
    if (recipes.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.restaurant_menu_outlined,
                size: 52, color: AppColors.textTertiary),
            const SizedBox(height: 16),
            const Text(
              'No recipes generated',
              style: TextStyle(
                color: AppColors.textPrimary,
                fontWeight: FontWeight.w600,
                fontSize: 16,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Add more items to your pantry\nand try again.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
            ),
            const SizedBox(height: 20),
            TextButton.icon(
              onPressed: () => provider.suggestMeals(),
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Try Again'),
              style: TextButton.styleFrom(
                foregroundColor: AppColors.primary,
              ),
            ),
          ],
        ),
      );
    }

    // ── Recipe List ──────────────────────────────────────────────────────────
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: recipes.length,
      itemBuilder: (context, index) {
        final recipe = recipes[index];
        return _RecipeCard(recipe: recipe, provider: provider);
      },
    );
  }
}

/// Extracted as a StatelessWidget to keep build method clean.
class _RecipeCard extends StatelessWidget {
  final Map<String, dynamic> recipe;
  final PantryProvider provider;

  const _RecipeCard({required this.recipe, required this.provider});

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
                _buildBookmarkButton(context, mealName, recipe),
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

            // ── Health Note (new field from updated backend) ─────────────────
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

  Widget _buildBookmarkButton(
      BuildContext context, String mealName, Map<String, dynamic> recipe) {
    if (provider.isAiRecipeSaved(mealName)) {
      return const Padding(
        padding: EdgeInsets.all(8),
        child: Icon(Icons.bookmark_added_rounded, color: AppColors.success),
      );
    }

    if (provider.isSavingAiRecipe(mealName)) {
      return const Padding(
        padding: EdgeInsets.all(12),
        child: SizedBox(
          width: 22,
          height: 22,
          child: CircularProgressIndicator(
              strokeWidth: 2, color: AppColors.secondary),
        ),
      );
    }

    return IconButton(
      icon: const Icon(Icons.bookmark_add_outlined),
      color: AppColors.secondary,
      tooltip: 'Save to My AI Recipes',
      onPressed: () async {
        final success = await provider.saveAiRecipe(recipe);
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(success
                  ? 'Recipe saved to AI Recipes!'
                  : (provider.error ?? 'Failed to save recipe.')),
              backgroundColor:
                  success ? AppColors.success : AppColors.error,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
          );
        }
      },
    );
  }
}

/// Reusable chip for metadata display (cooking time, difficulty, etc.)
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
