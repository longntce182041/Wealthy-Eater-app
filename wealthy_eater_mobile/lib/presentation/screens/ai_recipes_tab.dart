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
                const Icon(Icons.smart_toy_outlined, size: 60, color: AppColors.textSecondary),
                const SizedBox(height: 16),
                const Text(
                  'No AI Recipes Saved',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Go to the Pantry to generate and save meals.',
                  style: TextStyle(color: AppColors.textSecondary),
                ),
              ],
            ),
          );
        }

        return RefreshIndicator(
          onRefresh: provider.fetchSavedAiRecipes,
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
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppColors.border),
      ),
      elevation: 0,
      color: Colors.white,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.restaurant, color: AppColors.primary, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    recipe['mealName'] ?? 'Unknown Recipe',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.delete_outline),
                  color: Colors.redAccent,
                  onPressed: () => _confirmDelete(context, recipe),
                ),
              ],
            ),
            const SizedBox(height: 8),
            if (recipe['description'] != null && recipe['description'].toString().isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(
                  recipe['description'],
                  style: const TextStyle(fontSize: 14, color: AppColors.textSecondary),
                ),
              ),
            Row(
              children: [
                _buildChip(Icons.timer_outlined, '${recipe['cookingTimeMinutes'] ?? 0} min', AppColors.primaryLight, AppColors.primaryDark),
                const SizedBox(width: 8),
                _buildChip(Icons.star_rounded, recipe['difficulty'] ?? 'Medium', const Color(0xFFFFF3DC), AppColors.secondary),
              ],
            ),
            const Divider(height: 24, color: AppColors.border),
            const Text(
              'Cooking Steps',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.textPrimary),
            ),
            const SizedBox(height: 8),
            ...(recipe['cookingSteps'] as List? ?? []).asMap().entries.map((entry) {
              final idx = entry.key + 1;
              final raw = entry.value;
              final String stepText = raw is Map ? (raw['instruction'] ?? raw.toString()) : raw.toString();
              return Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('$idx. ', style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primaryDark)),
                    Expanded(child: Text(stepText, style: const TextStyle(color: AppColors.textSecondary, height: 1.3))),
                  ],
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  Widget _buildChip(IconData icon, String label, Color bgColor, Color textColor) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: textColor),
          const SizedBox(width: 4),
          Text(label, style: TextStyle(color: textColor, fontSize: 12, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  void _confirmDelete(BuildContext context, Map<String, dynamic> recipe) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Recipe'),
        content: Text('Are you sure you want to remove "${recipe['mealName']}" from your saved list?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent),
            onPressed: () async {
              Navigator.pop(ctx);
              final provider = context.read<PantryProvider>();
              final success = await provider.deleteAiRecipe(recipe['_id']);
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(success ? 'Recipe deleted' : (provider.error ?? 'Failed to delete')),
                    backgroundColor: success ? Colors.black87 : AppColors.error,
                  ),
                );
              }
            },
            child: const Text('Delete', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}
