import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../providers/meal_plan_provider.dart';
import '../widgets/daily_macro_report_widget.dart';

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
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          toolbarHeight: 0,
          bottom: const TabBar(
            indicatorColor: AppColors.primary,
            labelColor: AppColors.primary,
            unselectedLabelColor: AppColors.textSecondary,
            tabs: [
              Tab(icon: Icon(Icons.restaurant_menu), text: 'Weekly Plans'),
              Tab(icon: Icon(Icons.history), text: 'Meal Logs'),
              Tab(icon: Icon(Icons.pie_chart), text: 'Macro Report'),
            ],
          ),
        ),
        body: const TabBarView(
          children: [
            _WeeklyMealPlansView(),
            _MealLogsView(),
            DailyMacroReportWidget(),
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



  Future<void> _showGramInputDialog(int index, double currentGrams) async {
    final controller = TextEditingController(text: currentGrams.round().toString());
    final newGrams = await showDialog<double>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Enter Gram Weight'),
        content: TextField(
          controller: controller,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          autofocus: true,
          decoration: const InputDecoration(
            suffixText: 'g',
            hintText: 'e.g. 150',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              final val = double.tryParse(controller.text);
              if (val != null && val > 0) {
                Navigator.pop(context, val);
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Please enter a valid weight')),
                );
              }
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );

    if (newGrams != null && mounted) {
      _updateIngredientGrams(index, newGrams);
    }
  }

  Future<void> _logMeal() async {
    setState(() {
      _isSaving = true;
    });

    final messenger = ScaffoldMessenger.of(context);
    final provider = context.read<MealPlanProvider>();
    final success = await provider.logMealPlanItem(
          widget.item['_id'],
          actualWeight: _currentGram,
        );

    if (success) {
      await provider.loadMyMealPlan();
    }

    if (mounted) {
      setState(() {
        _isSaving = false;
      });
      messenger.showSnackBar(
        SnackBar(
          content: Text(success ? 'Meal logged successfully!' : 'Failed to log meal.'),
          backgroundColor: success ? AppColors.success : AppColors.error,
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }

  Future<void> _updateIngredientGrams(int index, double newGrams) async {
    setState(() {
      _isSaving = true;
    });

    final List<Map<String, dynamic>> updatedIngredients = [];
    final originalList = widget.item['custom_ingredients'] as List;

    for (int i = 0; i < originalList.length; i++) {
      final ci = originalList[i];
      final ing = ci['ingredient'];
      final ingId = ing?['_id'] ?? ci['ingredient_id'];
      final double grams = i == index ? newGrams : (ci['amount_gram'] as num).toDouble();
      updatedIngredients.add({
        'ingredientId': ingId,
        'grams': grams,
      });
    }

    final messenger = ScaffoldMessenger.of(context);
    final success = await context.read<MealPlanProvider>().updateMealItemWeight(
          widget.item['_id'],
          ingredients: updatedIngredients,
        );

    if (mounted) {
      setState(() {
        _isSaving = false;
      });
      messenger.showSnackBar(
        SnackBar(
          content: Text(success ? 'Ingredient portion updated!' : 'Failed to update ingredient.'),
          backgroundColor: success ? AppColors.success : AppColors.error,
          duration: const Duration(seconds: 1),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final recipe = widget.item['recipe'] as Map<String, dynamic>?;
    final provider = context.read<MealPlanProvider>();
    String recipeName = recipe?['name']?.toString() ?? 'Recipe';
    if (recipe == null && provider.mealPlan?['created_by'] != null) {
      final parts = provider.mealPlan!['created_by'].split('|');
      if (parts.length > 1) {
        recipeName = parts[1];
      } else {
        recipeName = 'AI Customized Meal';
      }
    }

    final imageUrl = recipe?['image_url']?.toString();
    final cookingTime = recipe?['cooking_time']?.toString();
    final mealType = widget.item['meal_type']?.toString() ?? 'meal';
    final dayOfWeek = widget.item['day_of_week']?.toString();
    final dayString = dayOfWeek != null ? 'Day $dayOfWeek • ' : '';
    final bool isCompleted = widget.item['is_completed'] ?? false;

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
                          '$dayString${_formatMealType(mealType)}',
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
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              recipeName,
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.textPrimary),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          if (isCompleted) ...[
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppColors.primaryLight,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.check_circle, color: AppColors.primaryDark, size: 14),
                                  SizedBox(width: 4),
                                  Text(
                                    'Completed',
                                    style: TextStyle(color: AppColors.primaryDark, fontSize: 11, fontWeight: FontWeight.bold),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ],
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
                          _buildNutrientStat('Carbs', '${_carbs.toStringAsFixed(1)}g', const Color(0xFF0288D1)),
                          _buildNutrientStat('Fat', '${_fat.toStringAsFixed(1)}g', AppColors.error),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          if (widget.item['custom_ingredients'] != null &&
              (widget.item['custom_ingredients'] as List).isNotEmpty) ...[
            const Divider(height: 1, color: AppColors.divider),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.restaurant_menu, size: 16, color: AppColors.textTertiary),
                      SizedBox(width: 6),
                      Text(
                        'Ingredients Portions',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: (widget.item['custom_ingredients'] as List).length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (context, index) {
                      final ci = widget.item['custom_ingredients'][index];
                      final ing = ci['ingredient'];
                      if (ing == null) return const SizedBox.shrink();
                      final name = ing['name'] ?? 'Unknown';
                      final currentGrams = (ci['amount_gram'] as num).toDouble();
                      return Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              name,
                              style: const TextStyle(fontSize: 13, color: AppColors.textPrimary),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          Row(
                            children: [
                              IconButton(
                                icon: const Icon(Icons.remove_circle_outline, size: 20, color: Colors.grey),
                                padding: EdgeInsets.zero,
                                constraints: const BoxConstraints(),
                                onPressed: _isSaving || isCompleted || currentGrams <= 10
                                    ? null
                                    : () => _updateIngredientGrams(index, currentGrams - 10),
                              ),
                              const SizedBox(width: 8),
                              InkWell(
                                onTap: _isSaving || isCompleted ? null : () => _showGramInputDialog(index, currentGrams),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                                  decoration: BoxDecoration(
                                    border: Border.all(color: AppColors.border),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    '${currentGrams.round()}g',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 13,
                                      color: isCompleted ? AppColors.textSecondary : AppColors.textPrimary,
                                    ),
                                  ),
                                ),
                              ),
                              IconButton(
                                icon: Icon(Icons.add_circle_outline, size: 20, color: isCompleted ? Colors.grey : AppColors.primary),
                                padding: EdgeInsets.zero,
                                constraints: const BoxConstraints(),
                                onPressed: _isSaving || isCompleted
                                    ? null
                                    : () => _updateIngredientGrams(index, currentGrams + 10),
                              ),
                            ],
                          ),
                        ],
                      );
                    },
                  ),
                ],
              ),
            ),
          ],
          Padding(
            padding: const EdgeInsets.only(left: 16, right: 16, bottom: 16),
            child: isCompleted
                ? OutlinedButton.icon(
                    onPressed: null,
                    icon: const Icon(Icons.check_circle, size: 18, color: AppColors.primary),
                    label: const Text('Completed', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: AppColors.primary, width: 1.5),
                      minimumSize: const Size.fromHeight(40),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  )
                : Column(
                    children: [
                      OutlinedButton.icon(
                        onPressed: _isSaving ? null : () async {
                          final controller = TextEditingController(text: _currentGram.round().toString());
                          final val = await showDialog<double>(
                            context: context,
                            builder: (context) => AlertDialog(
                              title: const Text('Test UC-42 Deviation'),
                              content: TextField(
                                controller: controller,
                                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                decoration: const InputDecoration(
                                  labelText: 'Total Meal Weight (grams)',
                                  hintText: 'Enter a huge value (e.g. 2000) to trigger UC-42',
                                ),
                              ),
                              actions: [
                                TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
                                FilledButton(
                                  onPressed: () => Navigator.pop(context, double.tryParse(controller.text)),
                                  child: const Text('Log Fake Meal'),
                                ),
                              ],
                            ),
                          );
                          if (val != null && mounted) {
                            setState(() {
                              _currentGram = val;
                            });
                            _logMeal();
                          }
                        },
                        icon: const Icon(Icons.science_outlined, size: 18),
                        label: Text('Simulate Deviation ($_currentGram g)'),
                        style: OutlinedButton.styleFrom(
                          minimumSize: const Size.fromHeight(40),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                      const SizedBox(height: 8),
                      FilledButton.icon(
                        onPressed: _isSaving ? null : _logMeal,
                        icon: const Icon(Icons.check_circle_outline, size: 18),
                        label: const Text('Complete Meal'),
                        style: FilledButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          minimumSize: const Size.fromHeight(40),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
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

class _WeeklyMealPlansView extends StatefulWidget {
  const _WeeklyMealPlansView();

  @override
  State<_WeeklyMealPlansView> createState() => _WeeklyMealPlansViewState();
}

class _WeeklyMealPlansViewState extends State<_WeeklyMealPlansView> {
  int? _selectedDay;
  int? _lastActiveDay;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<MealPlanProvider>().loadMyMealPlan();
    });
  }

  String _formatDate(String isoString) {
    try {
      final date = DateTime.parse(isoString).toLocal();
      return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
    } catch (e) {
      return '';
    }
  }

  Widget _buildDaySelector(int activeDay) {
    return Container(
      height: 50,
      margin: const EdgeInsets.only(bottom: 8),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: 7,
        itemBuilder: (context, index) {
          final day = index + 1;
          final isSelected = _selectedDay == day;
          final isActive = activeDay == day;
          return GestureDetector(
            onTap: () {
              setState(() {
                _selectedDay = day;
              });
            },
            child: Container(
              margin: const EdgeInsets.only(right: 8),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: isSelected
                    ? AppColors.primary
                    : (isActive ? AppColors.primary.withValues(alpha: 0.1) : AppColors.surface),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isSelected
                      ? AppColors.primary
                      : (isActive ? AppColors.primary : AppColors.border),
                  width: 1.5,
                ),
              ),
              child: Center(
                child: Row(
                  children: [
                    Text(
                      'Day $day',
                      style: TextStyle(
                        color: isSelected
                            ? Colors.white
                            : (isActive ? AppColors.primary : AppColors.textSecondary),
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                      ),
                    ),
                    if (isActive) ...[
                      const SizedBox(width: 6),
                      Container(
                        width: 6,
                        height: 6,
                        decoration: const BoxDecoration(
                          color: AppColors.success,
                          shape: BoxShape.circle,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final provider = context.watch<MealPlanProvider>();

    if (provider.state == MealPlanState.loading) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.primary),
      );
    }

    if (provider.state == MealPlanState.error) {
      return Center(
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
      );
    }

    final items = provider.items;

    if (items.isEmpty) {
      return SingleChildScrollView(
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
                decoration: const BoxDecoration(
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
      );
    }

    final activeDay = provider.mealPlan?['active_day'] as int? ?? 1;
    if (_lastActiveDay != activeDay) {
      _selectedDay = activeDay;
      _lastActiveDay = activeDay;
    }

    final dayItems = items.where((item) => item['day_of_week'] == _selectedDay).toList();

    return RefreshIndicator(
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
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Weekly Menu',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  if (provider.mealPlan?['date'] != null)
                    Text(
                      _formatDate(provider.mealPlan!['date'].toString()),
                      style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                    ),
                ],
              ),
              const Spacer(),
              if (provider.mealPlan?['created_by'] != null)
                Expanded(
                  child: Text(
                    'By: ${provider.mealPlan!['created_by'].split('|')[0]}',
                    style: const TextStyle(fontSize: 12, color: AppColors.textSecondary, fontStyle: FontStyle.italic),
                    textAlign: TextAlign.right,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 16),
          _buildDaySelector(activeDay),
          const SizedBox(height: 8),
          dayItems.isEmpty
              ? Container(
                  height: 200,
                  alignment: Alignment.center,
                  child: const Text(
                    'No meals scheduled for this day.',
                    style: TextStyle(color: AppColors.textSecondary),
                  ),
                )
              : ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: dayItems.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 16),
                  itemBuilder: (context, index) {
                    return _MealPlanItemCard(item: dayItems[index]);
                  },
                ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}

class _MealLogsView extends StatefulWidget {
  const _MealLogsView();

  @override
  State<_MealLogsView> createState() => _MealLogsViewState();
}

class _MealLogsViewState extends State<_MealLogsView> {
  DateTime _selectedDate = DateTime.now();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<MealPlanProvider>().loadMealLogs(date: _formatDate(_selectedDate));
    });
  }

  String _formatDate(DateTime dt) {
    return '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')}';
  }

  bool _isToday(DateTime date) {
    final now = DateTime.now();
    return date.year == now.year && date.month == now.month && date.day == now.day;
  }

  String _formatDateString(DateTime dt) {
    final base = _formatDate(dt);
    if (_isToday(dt)) {
      return '$base (Today)';
    }
    return base;
  }

  Future<void> _showEditLogDialog(Map<String, dynamic> log) async {
    final currentWeight = (log['actual_weight_gram'] as num).toDouble();
    final controller = TextEditingController(text: currentWeight.round().toString());
    final newWeight = await showDialog<double>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Edit Log Portion'),
        content: TextField(
          controller: controller,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          autofocus: true,
          decoration: const InputDecoration(
            suffixText: 'g',
            hintText: 'e.g. 300',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              final val = double.tryParse(controller.text);
              if (val != null && val > 0) {
                Navigator.pop(context, val);
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Please enter a valid weight')),
                );
              }
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );

    if (newWeight != null && mounted) {
      final provider = context.read<MealPlanProvider>();
      final messenger = ScaffoldMessenger.of(context);
      final success = await provider.updateMealLog(
        log['_id'],
        weight: newWeight,
        date: _formatDate(_selectedDate),
      );

      if (success) {
        await provider.loadMealLogs(date: _formatDate(_selectedDate));
        await provider.loadMyMealPlan();
        messenger.showSnackBar(
          const SnackBar(content: Text('Log updated successfully!'), backgroundColor: AppColors.success),
        );
      } else {
        messenger.showSnackBar(
          SnackBar(content: Text(provider.errorMessage ?? 'Failed to update log'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  Future<void> _confirmDeleteLog(Map<String, dynamic> log) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Log'),
        content: const Text('Are you sure you want to delete this meal log? This will set the corresponding meal plan item back to uncompleted.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            style: FilledButton.styleFrom(backgroundColor: AppColors.error),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirm == true && mounted) {
      final provider = context.read<MealPlanProvider>();
      final messenger = ScaffoldMessenger.of(context);
      final success = await provider.deleteMealLog(log['_id']);

      if (success) {
        await provider.loadMealLogs(date: _formatDate(_selectedDate));
        await provider.loadMyMealPlan();
        messenger.showSnackBar(
          const SnackBar(content: Text('Log deleted successfully!'), backgroundColor: AppColors.success),
        );
      } else {
        messenger.showSnackBar(
          SnackBar(content: Text(provider.errorMessage ?? 'Failed to delete log'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<MealPlanProvider>();

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 16, right: 16, top: 16, bottom: 8),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.border),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                IconButton(
                  icon: const Icon(Icons.chevron_left, color: AppColors.primary),
                  onPressed: () {
                    setState(() {
                      _selectedDate = _selectedDate.subtract(const Duration(days: 1));
                    });
                    provider.loadMealLogs(date: _formatDate(_selectedDate));
                  },
                ),
                InkWell(
                  onTap: () async {
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: _selectedDate,
                      firstDate: DateTime(2020),
                      lastDate: DateTime.now().add(const Duration(days: 365)),
                    );
                    if (picked != null) {
                      setState(() {
                        _selectedDate = picked;
                      });
                      provider.loadMealLogs(date: _formatDate(_selectedDate));
                    }
                  },
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.calendar_month, color: AppColors.primary, size: 20),
                        const SizedBox(width: 8),
                        Text(
                          _formatDateString(_selectedDate),
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.textPrimary),
                        ),
                      ],
                    ),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.chevron_right, color: AppColors.primary),
                  onPressed: () {
                    setState(() {
                      _selectedDate = _selectedDate.add(const Duration(days: 1));
                    });
                    provider.loadMealLogs(date: _formatDate(_selectedDate));
                  },
                ),
              ],
            ),
          ),
        ),
        Expanded(
          child: provider.isLoadingLogs
              ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
              : provider.logsError != null
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.error_outline, color: AppColors.error, size: 48),
                            const SizedBox(height: 16),
                            Text(provider.logsError!, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.textSecondary)),
                            const SizedBox(height: 16),
                            FilledButton(
                              onPressed: () => provider.loadMealLogs(date: _formatDate(_selectedDate)),
                              style: FilledButton.styleFrom(backgroundColor: AppColors.primary),
                              child: const Text('Retry'),
                            ),
                          ],
                        ),
                      ),
                    )
                  : provider.loggedMeals.isEmpty
                      ? RefreshIndicator(
                          onRefresh: () => provider.loadMealLogs(date: _formatDate(_selectedDate)),
                          color: AppColors.primary,
                          child: ListView(
                            physics: const AlwaysScrollableScrollPhysics(),
                            children: [
                              Container(
                                height: MediaQuery.of(context).size.height * 0.5,
                                alignment: Alignment.center,
                                padding: const EdgeInsets.all(24),
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    const Icon(Icons.history_toggle_off, size: 48, color: Colors.grey),
                                    const SizedBox(height: 16),
                                    const Text('No meal logs recorded on this day', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.textPrimary)),
                                    const SizedBox(height: 8),
                                    const Text(
                                      'Complete meals from your Weekly Menu to keep track of your daily eating history.',
                                      textAlign: TextAlign.center,
                                      style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        )
                      : RefreshIndicator(
                          onRefresh: () => provider.loadMealLogs(date: _formatDate(_selectedDate)),
                          color: AppColors.primary,
                          child: ListView.separated(
                            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                            itemCount: provider.loggedMeals.length,
                            separatorBuilder: (_, __) => const SizedBox(height: 16),
                            itemBuilder: (context, index) {
                              final log = provider.loggedMeals[index];
                              final recipe = log['recipe'] as Map<String, dynamic>?;
                              final String name = log['custom_name']?.toString() ?? recipe?['name']?.toString() ?? 'Logged Meal';
                              final double weight = (log['actual_weight_gram'] as num).toDouble();
                              final int cal = (log['actual_calories'] as num).toInt();
                              final double pro = (log['actual_protein'] as num).toDouble();
                              final double carbs = (log['actual_carbs'] as num).toDouble();
                              final double fat = (log['actual_fat'] as num).toDouble();
                              final DateTime date = DateTime.parse(log['create_at']).toLocal();

                              final timeStr = '${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
                              final dateStr = '${date.day}/${date.month}/${date.year}';

                              return Container(
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  color: AppColors.surface,
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(color: AppColors.border),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Expanded(
                                          child: Text(
                                            name,
                                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.textPrimary),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        Text(
                                          '$timeStr - $dateStr',
                                          style: const TextStyle(fontSize: 11, color: AppColors.textTertiary, fontWeight: FontWeight.w500),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 12),
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            const Text('Weight', style: TextStyle(fontSize: 10, color: AppColors.textTertiary)),
                                            const SizedBox(height: 2),
                                            Text('${weight.round()}g', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textPrimary)),
                                          ],
                                        ),
                                        Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            const Text('Energy', style: TextStyle(fontSize: 10, color: AppColors.textTertiary)),
                                            const SizedBox(height: 2),
                                            Text('$cal kcal', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.secondary)),
                                          ],
                                        ),
                                        Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            const Text('Protein', style: TextStyle(fontSize: 10, color: AppColors.textTertiary)),
                                            const SizedBox(height: 2),
                                            Text('${pro.toStringAsFixed(1)}g', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.primary)),
                                          ],
                                        ),
                                        Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            const Text('Carbs', style: TextStyle(fontSize: 10, color: AppColors.textTertiary)),
                                            const SizedBox(height: 2),
                                            Text('${carbs.toStringAsFixed(1)}g', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.blue)),
                                          ],
                                        ),
                                        Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            const Text('Fat', style: TextStyle(fontSize: 10, color: AppColors.textTertiary)),
                                            const SizedBox(height: 2),
                                            Text('${fat.toStringAsFixed(1)}g', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.redAccent)),
                                          ],
                                        ),
                                      ],
                                    ),
                                    const Divider(height: 24, color: AppColors.divider),
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.end,
                                      children: [
                                        TextButton.icon(
                                          onPressed: () => _showEditLogDialog(log),
                                          icon: const Icon(Icons.edit, size: 16),
                                          label: const Text('Edit'),
                                          style: TextButton.styleFrom(foregroundColor: AppColors.primary),
                                        ),
                                        const SizedBox(width: 8),
                                        TextButton.icon(
                                          onPressed: () => _confirmDeleteLog(log),
                                          icon: const Icon(Icons.delete_outline, size: 16),
                                          label: const Text('Delete'),
                                          style: TextButton.styleFrom(foregroundColor: AppColors.error),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              );
                            },
                          ),
                        ),
        ),
      ],
    );
  }
}
