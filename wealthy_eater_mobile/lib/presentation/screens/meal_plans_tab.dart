import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../providers/meal_plan_provider.dart';

class MealPlansTab extends StatefulWidget {
  const MealPlansTab({super.key});

  @override
  State<MealPlansTab> createState() => _MealPlansTabState();
}

class _MealPlansTabState extends State<MealPlansTab> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<MealPlanProvider>().loadMyMealPlan();
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final provider = context.watch<MealPlanProvider>();

    if (provider.state == MealPlanState.loading) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(color: AppColors.primary),
        ),
      );
    }

    if (provider.state == MealPlanState.error) {
      return Scaffold(
        backgroundColor: AppColors.background,
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline_rounded, size: 64, color: AppColors.error),
                const SizedBox(height: 16),
                Text(
                  provider.errorMessage ?? 'An error occurred loading your plan.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: AppColors.textSecondary, fontSize: 15),
                ),
                const SizedBox(height: 24),
                FilledButton.icon(
                  onPressed: () => provider.loadMyMealPlan(),
                  icon: const Icon(Icons.refresh),
                  label: const Text('Retry'),
                  style: FilledButton.styleFrom(backgroundColor: AppColors.primary),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final items = provider.items;

    if (items.isEmpty) {
      return Scaffold(
        backgroundColor: AppColors.background,
        body: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Container(
            height: MediaQuery.of(context).size.height * 0.7,
            alignment: Alignment.center,
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: AppColors.primaryLight,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.event_note_outlined, size: 64, color: AppColors.primary),
                ),
                const SizedBox(height: 24),
                const Text(
                  'No Meal Plan Found',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                ),
                const SizedBox(height: 12),
                const Text(
                  'You currently do not have an active weekly meal plan. Request one from your Nutritionist to start tracking!',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: AppColors.textSecondary, height: 1.5, fontSize: 14),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      body: RefreshIndicator(
        onRefresh: () => provider.loadMyMealPlan(),
        color: AppColors.primary,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20),
          children: [
            Row(
              children: [
                const Icon(Icons.calendar_today_outlined, size: 20, color: AppColors.primary),
                const SizedBox(width: 8),
                Text(
                  'Weekly Menu',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
                const Spacer(),
                if (provider.mealPlan?['created_by'] != null)
                  Text(
                    'By: ${provider.mealPlan!['created_by']}',
                    style: const TextStyle(fontSize: 12, color: AppColors.textSecondary, fontStyle: FontStyle.italic),
                  ),
              ],
            ),
            const SizedBox(height: 16),
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: items.length,
              separatorBuilder: (_, __) => const SizedBox(height: 16),
              itemBuilder: (context, index) {
                return _MealPlanItemCard(item: items[index]);
              },
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}

class _MealPlanItemCard extends StatefulWidget {
  final Map<String, dynamic> item;

  const _MealPlanItemCard({required this.item});

  @override
  State<_MealPlanItemCard> createState() => _MealPlanItemCardState();
}

class _MealPlanItemCardState extends State<_MealPlanItemCard> {
  late double _currentGram;
  late double _baseWeight;
  late int _baseCalories;
  late double _baseProtein;
  late double _baseFat;
  late double _baseCarbs;

  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _initNutrients();
  }

  @override
  void didUpdateWidget(covariant _MealPlanItemCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Sync with updated values from provider
    if (widget.item['customized_servings_gram'] != oldWidget.item['customized_servings_gram'] ||
        widget.item['base_weight'] != oldWidget.item['base_weight']) {
      _initNutrients();
    }
  }

  void _initNutrients() {
    _currentGram = (widget.item['customized_servings_gram'] as num).toDouble();
    _baseWeight = (widget.item['base_weight'] as num).toDouble();

    final baseNutrients = widget.item['base_nutrients'] as Map<String, dynamic>;
    _baseCalories = (baseNutrients['calories'] as num).toInt();
    _baseProtein = (baseNutrients['protein'] as num).toDouble();
    _baseFat = (baseNutrients['fat'] as num).toDouble();
    _baseCarbs = (baseNutrients['carbs'] as num).toDouble();
  }

  // Real-time scaled values
  int get _calories => ((_baseCalories * _currentGram) / _baseWeight).round();
  double get _protein => (_baseProtein * _currentGram) / _baseWeight;
  double get _fat => (_baseFat * _currentGram) / _baseWeight;
  double get _carbs => (_baseCarbs * _currentGram) / _baseWeight;

  String _formatMealType(String mealType) {
    if (mealType.isEmpty) return '';
    return mealType[0].toUpperCase() + mealType.substring(1).toLowerCase();
  }

  @override
  Widget build(BuildContext context) {
    final recipe = widget.item['recipe'] as Map<String, dynamic>?;
    final recipeName = recipe?['name']?.toString() ?? 'Recipe';
    final imageUrl = recipe?['image_url']?.toString();
    final cookingTime = recipe?['cooking_time']?.toString();
    final mealType = widget.item['meal_type']?.toString() ?? 'meal';

    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Row layout for image and title details
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Recipe image with meal type overlay
                Stack(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: Container(
                        width: 80,
                        height: 80,
                        color: Colors.grey.shade200,
                        child: imageUrl != null && imageUrl.isNotEmpty
                            ? Image.network(
                                imageUrl,
                                fit: BoxFit.cover,
                                errorBuilder: (_, __, ___) => const Icon(Icons.restaurant, color: Colors.grey),
                              )
                            : const Icon(Icons.restaurant, color: Colors.grey),
                      ),
                    ),
                    Positioned(
                      top: 4,
                      left: 4,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.primaryDark.withValues(alpha: 0.85),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          _formatMealType(mealType),
                          style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(width: 16),
                // Title and nutritional info
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        recipeName,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.textPrimary),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (cookingTime != null && cookingTime.isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            const Icon(Icons.access_time_outlined, size: 12, color: AppColors.textTertiary),
                            const SizedBox(width: 4),
                            Text(
                              '$cookingTime mins cooking',
                              style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                            ),
                          ],
                        ),
                      ],
                      const SizedBox(height: 8),
                      // Nutrient specs grid
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          _buildNutrientStat('Calories', '$_calories kcal', AppColors.secondary),
                          _buildNutrientStat('Protein', '${_protein.toStringAsFixed(1)}g', AppColors.primary),
                          _buildNutrientStat('Carbs', '${_carbs.toStringAsFixed(1)}g', Colors.blue),
                          _buildNutrientStat('Fat', '${_fat.toStringAsFixed(1)}g', Colors.redAccent),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: AppColors.divider),
          // Portions Slider Adjustment
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.scale_outlined, size: 16, color: AppColors.textTertiary),
                        SizedBox(width: 6),
                        Text(
                          'Portion Weight',
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                    Text(
                      '${_currentGram.round()}g',
                      style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary, fontSize: 14),
                    ),
                  ],
                ),
                SliderTheme(
                  data: SliderTheme.of(context).copyWith(
                    activeTrackColor: AppColors.primary,
                    inactiveTrackColor: AppColors.border,
                    thumbColor: AppColors.primary,
                    overlayColor: AppColors.primary.withValues(alpha: 0.15),
                    trackHeight: 4,
                  ),
                  child: Slider(
                    value: _currentGram,
                    min: 50.0,
                    max: 1000.0,
                    divisions: 95, // 10g steps: (1000 - 50) / 10 = 95 steps
                    label: '${_currentGram.round()}g',
                    onChanged: _isSaving
                        ? null
                        : (newValue) {
                            setState(() {
                              _currentGram = newValue;
                            });
                          },
                    onChangeEnd: (newValue) async {
                      setState(() {
                        _isSaving = true;
                      });

                      final messenger = ScaffoldMessenger.of(context);
                      final success = await context
                          .read<MealPlanProvider>()
                          .updateMealItemWeight(widget.item['_id'], newValue);

                      if (mounted) {
                        setState(() {
                          _isSaving = false;
                        });
                        messenger.showSnackBar(
                          SnackBar(
                            content: Text(success ? 'Portion updated successfully!' : 'Failed to save portion.'),
                            backgroundColor: success ? AppColors.success : AppColors.error,
                            duration: const Duration(seconds: 1),
                          ),
                        );
                      }
                    },
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNutrientStat(String label, String value, Color color) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          value,
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: color),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: const TextStyle(fontSize: 10, color: AppColors.textTertiary, fontWeight: FontWeight.w500),
        ),
      ],
    );
  }
}
