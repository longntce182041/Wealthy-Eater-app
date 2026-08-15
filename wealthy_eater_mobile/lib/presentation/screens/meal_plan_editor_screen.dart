import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/network/api_client.dart';
import '../providers/nutritionist_provider.dart';
import '../../data/models/draft_meal_plan_dto.dart';

class MealPlanEditorScreen extends StatefulWidget {
  final String planId;
  const MealPlanEditorScreen({super.key, required this.planId});

  @override
  State<MealPlanEditorScreen> createState() => _MealPlanEditorScreenState();
}

class _MealPlanEditorScreenState extends State<MealPlanEditorScreen> {
  // A local copy of the draft for editing before saving
  Map<String, dynamic>? _localDraft;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<NutritionistProvider>().fetchDraftMealPlan(widget.planId).then((_) {
        if (!mounted) return;
        final state = context.read<NutritionistProvider>().draftMealPlan;
        if (state != null) {
          setState(() {
            _localDraft = Map<String, dynamic>.from(state);
            // Deep copy items for local editing
            _localDraft!['items'] = List<Map<String, dynamic>>.from(
              (state['items'] as List).map((i) => Map<String, dynamic>.from(i))
            );
          });
        }
      });
    });
  }

  void _saveChanges() async {
    if (_localDraft == null) return;
    
    final items = _localDraft!['items'] as List;
    final payloadItems = items.map((item) {
      // Only send ingredients for truly AI-generated items (no recipe).
      // Recipe-based items also have custom_ingredients in DB for nutrition calc,
      // but sending them would cause backend to overwrite recipe_id = "AI_GENERATED".
      final bool isAIItem = item['recipe'] == null &&
          (item['recipe_id'] == null || item['recipe_id'] == 'AI_GENERATED');

      List<IngredientUpdate>? ingredients;
      if (isAIItem && item['custom_ingredients'] != null) {
        ingredients = (item['custom_ingredients'] as List).map((ing) {
          return IngredientUpdate(
            ingredientId: ing['ingredient']['_id']?.toString() ?? '',
            grams: ing['amount_gram'],
          );
        }).where((u) => u.ingredientId.isNotEmpty).toList();
      }
      
      return DraftItemUpdate(
        itemId: item['_id']?.toString() ?? '',
        recipeId: isAIItem ? null : (item['recipe_id']?.toString() ?? item['recipe']?['_id']?.toString()),
        mealType: item['meal_type'],
        customizedServingsGram: item['customized_servings_gram'],
        targetCalories: item['target_calories'] ?? item['customized_nutrients']?['calories'],
        ingredients: ingredients,
      );
    }).toList();

    final request = DraftUpdateRequest(items: payloadItems);
    
    final success = await context.read<NutritionistProvider>().updateDraftMealPlan(
      widget.planId, 
      request.toJson(),
    );

    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Draft saved successfully!")),
      );
      Navigator.pop(context); // Go back or stay based on workflow
    }
  }

  void _openEditBottomSheet(Map<String, dynamic> item, int index) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
        ),
        child: _EditItemBottomSheet(
          item: item,
          medicalCondition: _localDraft?['medical_condition'],
          onSave: (updatedItem) {
            setState(() {
              final isViolated = updatedItem['macro_violation'] == true || _checkItemViolation(updatedItem);
              updatedItem['macro_violation'] = isViolated;
              (_localDraft!['items'] as List)[index] = Map<String, dynamic>.from(updatedItem);
              _recalculateTotals();
            });
          },
        ),
      ),
    );
  }

  bool _checkItemViolation(Map<String, dynamic> item) {
    final medCond = _localDraft?['medical_condition'];
    if (medCond == null) return false;
    final rawExcluded = medCond['excluded_ingredient_tags'];
    final List<String> excludedTags = (rawExcluded is List)
        ? rawExcluded.map((e) => e.toString().toUpperCase().trim()).toList()
        : [];

    if (excludedTags.isNotEmpty) {
      final ingList = item['ingredients'] as List? ?? item['recipe']?['ingredients'] as List? ?? [];
      for (var ing in ingList) {
        final rawTags = ing['health_tags'] ?? ing['healthTags'] ?? ing['ingredient']?['health_tags'] ?? ing['ingredient']?['healthTags'] ?? ing['ingredient_id']?['health_tags'] ?? [];
        final List<String> tags = (rawTags is List)
            ? rawTags.map((e) => e.toString().toUpperCase().trim()).toList()
            : [];
        if (tags.any((t) => excludedTags.contains(t))) {
          return true;
        }
      }

      final customIngs = item['custom_ingredients'] as List? ?? [];
      for (var ci in customIngs) {
        final rawTags = ci['health_tags'] ?? ci['healthTags'] ?? ci['ingredient']?['health_tags'] ?? ci['ingredient']?['healthTags'] ?? ci['ingredient_id']?['health_tags'] ?? [];
        final List<String> tags = (rawTags is List)
            ? rawTags.map((e) => e.toString().toUpperCase().trim()).toList()
            : [];
        if (tags.any((t) => excludedTags.contains(t))) {
          return true;
        }
      }
    }

    final nc = medCond['nutrient_constraints'];
    if (nc != null && nc is Map && nc['carb_ratio_max'] != null) {
      final macros = item['customized_nutrients'] ?? item['base_nutrients'] ?? {};
      final num cals = macros['calories'] ?? 0;
      final num carbs = macros['carbs'] ?? 0;
      if (cals > 0) {
        final actualRatio = (carbs * 4) / cals;
        final maxRatio = (nc['carb_ratio_max'] as num).toDouble();
        if (actualRatio > maxRatio + 0.05) {
          return true;
        }
      }
    }

    return false;
  }

  void _recalculateTotals() {
    if (_localDraft == null) return;
    // Totals recalculated by backend on save. Bottom sheet handles item-level calculation.
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<NutritionistProvider>();

    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: const Text('Edit Draft Plan', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black87,
        elevation: 0,
        actions: [
          if (provider.isUpdatingDraft)
            const Center(child: Padding(padding: EdgeInsets.only(right: 16), child: CircularProgressIndicator()))
          else
            TextButton.icon(
              onPressed: _saveChanges,
              icon: const Icon(Icons.save),
              label: const Text('Save Draft'),
              style: TextButton.styleFrom(foregroundColor: Colors.green[700]),
            ),
        ],
      ),
      body: provider.isLoadingDraft
          ? const Center(child: CircularProgressIndicator())
          : provider.loadDraftError != null
              ? Center(child: Text(provider.loadDraftError!, style: const TextStyle(color: Colors.red)))
              : _localDraft == null
                  ? const Center(child: Text("No draft data found."))
                  : _buildEditorGrid(),
    );
  }

  Widget _buildEditorGrid() {
    final items = _localDraft!['items'] as List;
    final dataCoverageWarning = _localDraft!['data_coverage_warning'] == true;

    // Check if this is a weekly plan (items have day_of_week)
    final hasWeeklyDays = items.any((item) => item['day_of_week'] != null);

    Widget listContent;
    if (!hasWeeklyDays) {
      listContent = _buildFlatItemList(items);
    } else {
      final Map<int, List<Map<String, dynamic>>> groupedByDay = {};
      for (int i = 0; i < items.length; i++) {
        final item = items[i] as Map<String, dynamic>;
        final day = (item['day_of_week'] as num?)?.toInt() ?? 1;
        groupedByDay.putIfAbsent(day, () => []);
        groupedByDay[day]!.add({...item, '_originalIndex': i});
      }

      final sortedDays = groupedByDay.keys.toList()..sort();
      final dayLabels = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

      listContent = ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: sortedDays.length,
        itemBuilder: (context, dayIndex) {
          final day = sortedDays[dayIndex];
          final dayItems = groupedByDay[day]!;
          final dayLabel = day <= 7 ? dayLabels[day] : 'Day $day';

          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (dayIndex > 0) const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.blue[700],
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  'Day $day — $dayLabel',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                  ),
                ),
              ),
              const SizedBox(height: 8),
              ...dayItems.map((item) {
                final originalIndex = item['_originalIndex'] as int;
                return Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: _buildItemCard(item, originalIndex),
                );
              }),
            ],
          );
        },
      );
    }

    // Wrap with data_coverage_warning banner if needed
    if (!dataCoverageWarning) return listContent;

    return Column(
      children: [
        Material(
          color: Colors.amber[700],
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Row(
              children: const [
                Icon(Icons.warning_amber_rounded, color: Colors.white, size: 20),
                SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Nutritional tag data for medical conditions is incomplete. Please check manually.',
                    style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w500),
                  ),
                ),
              ],
            ),
          ),
        ),
        Expanded(child: listContent),
      ],
    );
  }

  Widget _buildFlatItemList(List items) {
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: items.length,
      separatorBuilder: (context, index) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final item = items[index];
        return _buildItemCard(item, index);
      },
    );
  }

  Widget _buildItemCard(Map<String, dynamic> item, int index) {
    final isAI = item['recipe'] == null;
    final name = isAI ? "AI Customized Meal" : item['recipe']['name'];
    final macros = item['customized_nutrients'] ?? item['base_nutrients'] ?? {};
    final mealType = item['meal_type'] ?? 'LUNCH';
    final hasMacroViolation = item['macro_violation'] == true || _checkItemViolation(item);

    // Meal type color coding
    Color mealColor;
    IconData mealIcon;
    switch (mealType.toUpperCase()) {
      case 'BREAKFAST':
        mealColor = Colors.amber[800]!;
        mealIcon = Icons.wb_sunny_outlined;
        break;
      case 'DINNER':
        mealColor = Colors.indigo[700]!;
        mealIcon = Icons.nightlight_outlined;
        break;
      default: // LUNCH
        mealColor = Colors.green[700]!;
        mealIcon = Icons.light_mode_outlined;
    }

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: hasMacroViolation ? BorderSide(color: Colors.amber.shade600, width: 1.5) : BorderSide.none,
      ),
      child: Stack(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(mealIcon, size: 16, color: mealColor),
                              const SizedBox(width: 4),
                              Text(mealType, style: TextStyle(fontWeight: FontWeight.bold, color: mealColor, fontSize: 12)),
                              if (hasMacroViolation) ...[
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: Colors.amber.shade50,
                                    borderRadius: BorderRadius.circular(6),
                                    border: Border.all(color: Colors.amber.shade600, width: 1),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(Icons.warning_amber_rounded, size: 14, color: Colors.amber[900]),
                                      const SizedBox(width: 3),
                                      Text(
                                        'Violation',
                                        style: TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.bold,
                                          color: Colors.amber[900],
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(name, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold), overflow: TextOverflow.ellipsis),
                        ],
                      ),
                    ),
                    // Action menu: edit recipe OR generate with AI
                    PopupMenuButton<String>(
                      icon: const Icon(Icons.more_vert),
                      onSelected: (value) {
                        if (value == 'edit') {
                          _openEditBottomSheet(item, index);
                        } else if (value == 'ai_regen') {
                          _triggerAIRegen(item, index);
                        }
                      },
                      itemBuilder: (_) => [
                        const PopupMenuItem(
                          value: 'edit',
                          child: Row(children: [
                            Icon(Icons.swap_horiz, size: 18),
                            SizedBox(width: 8),
                            Text('Change Recipe'),
                          ]),
                        ),
                        PopupMenuItem(
                          value: 'ai_regen',
                          child: Row(children: [
                            Icon(Icons.auto_fix_high, size: 18, color: Colors.deepPurple[400]),
                            const SizedBox(width: 8),
                            Text('Generate with AI', style: TextStyle(color: Colors.deepPurple[400])),
                          ]),
                        ),
                      ],
                    ),
                  ],
                ),
                const Divider(),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _macroWidget('Cal', '${macros['calories'] ?? 0} kcal', Colors.orange),
                    _macroWidget('Pro', '${macros['protein'] ?? 0}g', Colors.red),
                    _macroWidget('Carb', '${macros['carbs'] ?? 0}g', Colors.green),
                    _macroWidget('Fat', '${macros['fat'] ?? 0}g', Colors.purple),
                  ],
                )
              ],
            ),
          ),
          // Amber warning badge overlay (top-right corner) for macro violations
          if (hasMacroViolation)
            Positioned(
              top: 6,
              right: 6,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.amber[700],
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Text('⚠️ Violation', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
              ),
            ),
        ],
      ),
    );
  }

  /// Triggers AI regeneration for a meal item.
  Future<void> _triggerAIRegen(Map<String, dynamic> item, int index) async {
    final planId = widget.planId;
    final itemId = item['_id']?.toString() ?? '';
    if (itemId.isEmpty) return;

    final provider = context.read<NutritionistProvider>();

    // Show loading snackbar
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Row(children: [
            SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)),
            SizedBox(width: 12),
            Text('AI is generating meal suggestions...'),
          ]),
          duration: Duration(seconds: 60),
        ),
      );
    }

    await provider.regenerateItem(planId, itemId);

    if (!mounted) return;
    ScaffoldMessenger.of(context).hideCurrentSnackBar();

    if (provider.regenerateError != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: ${provider.regenerateError}'), backgroundColor: Colors.red),
      );
      return;
    }

    final previewResult = provider.previewResult;
    if (previewResult == null) return;

    // Show preview dialog
    await _showAIPreviewDialog(planId, itemId, index, previewResult);
  }

  /// Shows the AI meal preview bottom sheet.
  Future<void> _showAIPreviewDialog(
    String planId,
    String itemId,
    int index,
    Map<String, dynamic> previewResult,
  ) async {
    final previewId = previewResult['previewId'] as String? ?? '';
    final preview = previewResult['preview'] as Map<String, dynamic>? ?? {};

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.75,
        maxChildSize: 0.95,
        builder: (_, scrollController) => SingleChildScrollView(
          controller: scrollController,
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Handle bar
              Center(
                child: Container(
                  width: 40, height: 4,
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(2)),
                ),
              ),

              // Header
              Row(children: [
                Icon(Icons.auto_fix_high, color: Colors.deepPurple[400]),
                const SizedBox(width: 8),
                const Text('AI Meal Suggestion', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              ]),
              const SizedBox(height: 16),

              // Dish name
              Text(
                preview['dish_name'] ?? 'Optimized Meal',
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),

              // Description
              if (preview['description'] != null)
                Text(preview['description'], style: TextStyle(color: Colors.grey[600])),
              const SizedBox(height: 12),

              // Warning banner (medical condition conflict)
              if ((preview['warning'] as String?)?.isNotEmpty == true)
                Container(
                  padding: const EdgeInsets.all(12),
                  margin: const EdgeInsets.only(bottom: 12),
                  decoration: BoxDecoration(
                    color: Colors.orange[50],
                    border: Border.all(color: Colors.orange),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(children: [
                    Icon(Icons.health_and_safety, color: Colors.orange[700], size: 18),
                    const SizedBox(width: 8),
                    Expanded(child: Text(preview['warning'], style: TextStyle(color: Colors.orange[800], fontSize: 13))),
                  ]),
                ),

              // Macro summary
              if (preview['macro'] != null) ...[
                const Text('Nutritional Information:', style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _macroWidget('Cal', '${preview['macro']['calories'] ?? 0} kcal', Colors.orange),
                    _macroWidget('Pro', '${preview['macro']['protein'] ?? 0}g', Colors.red),
                    _macroWidget('Carb', '${preview['macro']['carbs'] ?? 0}g', Colors.green),
                    _macroWidget('Fat', '${preview['macro']['fat'] ?? 0}g', Colors.purple),
                  ],
                ),
                const SizedBox(height: 16),
              ],

              // Cooking details
              Row(children: [
                const Icon(Icons.timer_outlined, size: 16, color: Colors.grey),
                const SizedBox(width: 4),
                Text('${preview['cooking_time_minutes'] ?? "?"} mins  •  Difficulty: ${preview['difficulty'] ?? "?"}',
                  style: TextStyle(color: Colors.grey[600], fontSize: 13)),
              ]),
              const SizedBox(height: 16),

              // Cooking steps
              if (preview['steps'] != null) ...[
                const Text('Cooking Steps:', style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                ...((preview['steps'] as List).asMap().entries.map((e) => Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Text('${e.key + 1}. ${e.value}', style: const TextStyle(fontSize: 14)),
                ))),
                const SizedBox(height: 24),
              ],

              // Action buttons
              Row(children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () {
                      context.read<NutritionistProvider>().discardPreview();
                      Navigator.of(ctx).pop();
                    },
                    child: const Text('Cancel'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 2,
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.deepPurple),
                    icon: const Icon(Icons.check, color: Colors.white),
                    label: const Text('Apply', style: TextStyle(color: Colors.white)),
                    onPressed: previewId.isEmpty ? null : () async {
                      Navigator.of(ctx).pop();
                      await _applyAISuggestion(planId, itemId, index, previewId);
                    },
                  ),
                ),
              ]),
            ],
          ),
        ),
      ),
    );
  }

  /// Applies the AI suggestion and refreshes the item on screen.
  Future<void> _applyAISuggestion(
    String planId,
    String itemId,
    int index,
    String previewId,
  ) async {
    final provider = context.read<NutritionistProvider>();
    final result = await provider.applyPreview(planId, itemId, previewId);

    if (!mounted) return;

    if (result == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: ${provider.regenerateError}'), backgroundColor: Colors.red),
      );
      return;
    }

    // Update the local draft item in-place
    final data = result['data'] as Map<String, dynamic>? ?? {};
    setState(() {
      final items = _localDraft!['items'] as List;
      items[index] = {
        ...items[index] as Map<String, dynamic>,
        'recipe': null,
        'recipe_id': 'AI_GENERATED',
        'macro_violation': result['macro_violation'] ?? false,
        'customized_nutrients': data['macro'],
        'target_snapshot': data['target_snapshot'],
      };
    });

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Applied successfully! Meal has been updated.'), backgroundColor: Colors.green),
    );
  }


  Widget _macroWidget(String label, String val, MaterialColor color) {
    return Column(
      children: [
        Text(label, style: TextStyle(color: Colors.grey[600], fontSize: 12)),
        const SizedBox(height: 4),
        Text(val, style: TextStyle(color: color[700], fontWeight: FontWeight.bold)),
      ],
    );
  }
}

// ════════════════════════════════════════════════════════════════════════════
// _EditItemBottomSheet — Adjust Meal modal
// ════════════════════════════════════════════════════════════════════════════
class _EditItemBottomSheet extends StatefulWidget {
  final Map<String, dynamic> item;
  final Map<String, dynamic>? medicalCondition;
  final Function(Map<String, dynamic>) onSave;

  const _EditItemBottomSheet({
    required this.item,
    this.medicalCondition,
    required this.onSave,
  });

  @override
  State<_EditItemBottomSheet> createState() => _EditItemBottomSheetState();
}

class _EditItemBottomSheetState extends State<_EditItemBottomSheet> {
  late Map<String, dynamic> _editingItem;
  final TextEditingController _servingsController = TextEditingController();
  final TextEditingController _caloriesController = TextEditingController();

  /// The recipe selected via the picker. null = AI mode.
  Map<String, dynamic>? _selectedRecipe;

  /// Base macros per base_servings of the selected recipe (used for ratio calculation).
  Map? _baseNutrition;

  @override
  void initState() {
    super.initState();
    // Deep copy for local edits inside bottom sheet
    _editingItem = Map<String, dynamic>.from(widget.item);
    if (_editingItem['custom_ingredients'] != null) {
      _editingItem['custom_ingredients'] = List<Map<String, dynamic>>.from(
        (_editingItem['custom_ingredients'] as List).map((i) => Map<String, dynamic>.from(i))
      );
    }
    _servingsController.text = (_editingItem['customized_servings_gram'] ?? _editingItem['base_weight'] ?? '').toString();
    _caloriesController.text = (_editingItem['target_calories'] ?? _editingItem['customized_nutrients']?['calories'] ?? '').toString();

    // Pre-populate selected recipe from existing item data (recipe object from API)
    final existingRecipe = _editingItem['recipe'];
    if (existingRecipe != null && existingRecipe is Map<String, dynamic>) {
      final recipeId = existingRecipe['_id'] ?? existingRecipe['id'] ?? _editingItem['recipe_id'] ?? '';
      final rawIngredients = existingRecipe['ingredients'] ?? _editingItem['ingredients'] ?? [];
      final List ingList = (rawIngredients is List) ? List.from(rawIngredients) : [];

      _selectedRecipe = {
        'id': recipeId,
        'name': existingRecipe['name'] ?? '',
        'imageUrl': existingRecipe['image_url'] ?? existingRecipe['imageUrl'] ?? '',
        'baseServings': existingRecipe['base_servings'] ?? existingRecipe['baseServings'] ?? 1,
        'cookingTime': existingRecipe['cooking_time'] ?? existingRecipe['cookingTime'] ?? 0,
        'nutrition': _editingItem['base_nutrients'] ?? _editingItem['customized_nutrients'],
        'ingredients': ingList,
      };
      _baseNutrition = _editingItem['base_nutrients'] ?? _editingItem['customized_nutrients'];
      _editingItem['ingredients'] = ingList;

      // If ingredients list is empty, fetch full recipe ingredients immediately in background
      if (ingList.isEmpty && recipeId.toString().isNotEmpty) {
        WidgetsBinding.instance.addPostFrameCallback((_) async {
          if (!mounted) return;
          try {
            final apiClient = context.read<ApiClient>();
            final response = await apiClient.get('/api/user/recipes/$recipeId');
            if (response.statusCode == 200 && response.data['success'] == true) {
              final data = response.data['data'] as Map<String, dynamic>?;
              final fetchedIngs = data?['ingredients'] as List? ?? [];
              if (mounted && _selectedRecipe?['id'] == recipeId && fetchedIngs.isNotEmpty) {
                setState(() {
                  _editingItem['ingredients'] = fetchedIngs;
                  _selectedRecipe!['ingredients'] = fetchedIngs;
                });
              }
            }
          } catch (_) {}
        });
      }
    }
  }

  @override
  void dispose() {
    _servingsController.dispose();
    _caloriesController.dispose();
    super.dispose();
  }

  // ── Recipe selection callback ─────────────────────────────────────────────

  void _onRecipeSelected(Map<String, dynamic> recipe) async {
    final recipeId = recipe['id'] ?? recipe['_id'];

    setState(() {
      _selectedRecipe = recipe;
      _baseNutrition = (_selectedRecipe?['nutrition'] ?? recipe['nutrition']) as Map?;
      _editingItem['recipe_id'] = recipeId;
      _editingItem['recipe'] = _selectedRecipe;

      // Đưa danh sách ingredients READ-ONLY từ recipe vào state hiển thị
      _editingItem['ingredients'] = _selectedRecipe?['ingredients'] ?? recipe['ingredients'] ?? [];
      _editingItem['custom_ingredients'] = null; // Reset AI custom ingredients

      // Get base weight in grams for the new recipe (default to 100g if missing)
      final recipeBaseWeight = (_selectedRecipe?['base_weight'] as num?)?.toDouble() ??
                               (recipe['baseWeight'] as num?)?.toDouble() ??
                               (_baseNutrition?['baseWeight'] as num?)?.toDouble() ??
                               100.0;

      _editingItem['base_weight'] = recipeBaseWeight;
      _editingItem['customized_servings_gram'] = recipeBaseWeight;

      // Update text controller to match the newly selected recipe's base weight
      _servingsController.text = recipeBaseWeight.round().toString();

      _recalculateMacrosFromRecipe();
    });

    // Fetch full recipe ingredients if list is empty
    if ((_editingItem['ingredients'] as List).isEmpty && recipeId != null && recipeId.toString().isNotEmpty) {
      try {
        final apiClient = context.read<ApiClient>();
        final response = await apiClient.get('/api/user/recipes/$recipeId');
        if (response.statusCode == 200 && response.data['success'] == true) {
          final data = response.data['data'] as Map<String, dynamic>?;
          final ingList = data?['ingredients'] as List? ?? [];
          if (mounted && _editingItem['recipe_id'] == recipeId) {
            double totalWeight = 0;
            for (var ing in ingList) {
              final num qty = ing['quantity'] ?? ing['amount_gram'] ?? ing['base_quantity'] ?? 0;
              totalWeight += qty;
            }

            setState(() {
              _editingItem['ingredients'] = ingList;
              if (_selectedRecipe != null) {
                _selectedRecipe!['ingredients'] = ingList;
              }
              if (_editingItem['recipe'] != null && _editingItem['recipe'] is Map) {
                _editingItem['recipe']['ingredients'] = ingList;
              }
              if (totalWeight > 0) {
                _editingItem['base_weight'] = totalWeight;
                _editingItem['customized_servings_gram'] = totalWeight;
                _servingsController.text = totalWeight.round().toString();
              }
              _editingItem['macro_violation'] = _checkClientViolation();
            });
            _recalculateMacrosFromRecipe();
          }
        }
      } catch (_) {}
    } else {
      _recalculatePortionFromRecipeIngredients();
    }
  }

  void _onClearSelection() {
    setState(() {
      _selectedRecipe = null;
      _baseNutrition = null;
      _editingItem['recipe_id'] = 'AI_GENERATED';
      _editingItem['recipe'] = null;
      _editingItem['ingredients'] = [];

      // Retain or restore custom_ingredients so AI mode displays the ingredients list & allows edits
      if (widget.item['custom_ingredients'] != null) {
        _editingItem['custom_ingredients'] = List<Map<String, dynamic>>.from(
          (widget.item['custom_ingredients'] as List).map((i) => Map<String, dynamic>.from(i))
        );
      } else {
        _editingItem['custom_ingredients'] = <Map<String, dynamic>>[];
      }
      _recalculateLocalMacros();
    });
  }

  /// Recalculates total portion weight from recipe ingredients and updates macros.
  void _recalculatePortionFromRecipeIngredients() {
    if (_editingItem['ingredients'] == null) return;
    final list = _editingItem['ingredients'] as List;
    if (list.isEmpty) return;

    double totalWeight = 0;
    for (var ing in list) {
      final num qty = ing['quantity'] ?? ing['amount_gram'] ?? ing['base_quantity'] ?? 0;
      totalWeight += qty;
    }

    if (totalWeight > 0) {
      setState(() {
        _editingItem['customized_servings_gram'] = totalWeight;
        _servingsController.text = totalWeight.round().toString();
        _recalculateMacrosFromRecipe();
      });
    }
  }

  /// Recalculates macros based on selected recipe + current weight in grams.
  ///
  /// Formula:
  ///   baseWeight = recipe total weight in grams (e.g. 481g)
  ///   currentWeight = user entered grams in textfield (e.g. 481g)
  ///   ratio = currentWeight / baseWeight (e.g. 481 / 481 = 1.0)
  ///   macro = baseNutrition * ratio
  ///
  /// This fixes the unit-mismatch bug where currentWeight (481g) was divided by
  /// baseServings (1), producing a 481x multiplier (466 kcal * 481 = 224,246 kcal).
  void _recalculateMacrosFromRecipe() {
    if (_baseNutrition == null) return;

    final baseWeight = (_editingItem['base_weight'] as num?)?.toDouble() ??
                       (_selectedRecipe?['baseWeight'] as num?)?.toDouble() ??
                       (_selectedRecipe?['nutrition']?['baseWeight'] as num?)?.toDouble() ??
                       481.0; // Sensible default fallback

    final currentWeight = double.tryParse(_servingsController.text) ?? baseWeight;
    final ratio = baseWeight > 0 ? (currentWeight / baseWeight) : 1.0;
    final safeRatio = ratio.clamp(0.01, 20.0);

    setState(() {
      _editingItem['customized_nutrients'] = {
        'calories': ((_baseNutrition!['calories'] as num? ?? 0) * safeRatio).round(),
        'protein': double.parse(((_baseNutrition!['protein'] as num? ?? 0) * safeRatio).toStringAsFixed(1)),
        'carbs':   double.parse(((_baseNutrition!['carbs'] as num? ?? 0) * safeRatio).toStringAsFixed(1)),
        'fat':     double.parse(((_baseNutrition!['fat'] as num? ?? 0) * safeRatio).toStringAsFixed(1)),
      };
      _editingItem['macro_violation'] = _checkClientViolation();
    });
  }

  /// Recalculates macros for AI-generated meals (ingredient-based).
  void _recalculateLocalMacros() {
    if (_editingItem['custom_ingredients'] == null) return;

    double totalCal = 0;
    double totalPro = 0;
    double totalCarb = 0;
    double totalFat = 0;

    for (var ci in _editingItem['custom_ingredients']) {
      final ing = ci['ingredient'];
      if (ing == null) continue;
      final num grams = ci['amount_gram'] ?? 0;

      final num calPer100 = ing['calories_per_unit'] ?? 0;
      final num proPer100 = ing['protein'] ?? 0;
      final num carbPer100 = ing['carbs'] ?? 0;
      final num fatPer100 = ing['fat'] ?? 0;

      totalCal += (calPer100 * grams) / 100;
      totalPro += (proPer100 * grams) / 100;
      totalCarb += (carbPer100 * grams) / 100;
      totalFat += (fatPer100 * grams) / 100;
    }

    setState(() {
      _editingItem['customized_nutrients'] = {
        'calories': totalCal.round(),
        'protein': num.parse(totalPro.toStringAsFixed(1)),
        'carbs': num.parse(totalCarb.toStringAsFixed(1)),
        'fat': num.parse(totalFat.toStringAsFixed(1)),
      };
      _editingItem['macro_violation'] = _checkClientViolation();
    });
  }

  /// Real-time client-side check for medical condition violations.
  bool _checkClientViolation() {
    final medCond = widget.medicalCondition;
    if (medCond == null) return false;
    final rawExcluded = medCond['excluded_ingredient_tags'];
    final List<String> excludedTags = (rawExcluded is List)
        ? rawExcluded.map((e) => e.toString().toUpperCase().trim()).toList()
        : [];

    // 1. Check ingredients in selected recipe
    if (excludedTags.isNotEmpty) {
      final ingList = _editingItem['ingredients'] as List? ?? [];
      for (var ing in ingList) {
        final rawTags = ing['health_tags'] ?? ing['ingredient']?['health_tags'] ?? [];
        final List<String> tags = (rawTags is List)
            ? rawTags.map((e) => e.toString().toUpperCase().trim()).toList()
            : [];
        if (tags.any((t) => excludedTags.contains(t))) {
          return true;
        }
      }

      // Check custom ingredients (AI mode)
      final customIngs = _editingItem['custom_ingredients'] as List? ?? [];
      for (var ci in customIngs) {
        final rawTags = ci['health_tags'] ?? ci['ingredient']?['health_tags'] ?? ci['ingredient_id']?['health_tags'] ?? [];
        final List<String> tags = (rawTags is List)
            ? rawTags.map((e) => e.toString().toUpperCase().trim()).toList()
            : [];
        if (tags.any((t) => excludedTags.contains(t))) {
          return true;
        }
      }
    }

    // 2. Check nutrient constraints (macros)
    final nc = medCond['nutrient_constraints'];
    if (nc != null && nc is Map && nc['carb_ratio_max'] != null) {
      final num cals = _editingItem['customized_nutrients']?['calories'] ?? 0;
      final num carbs = _editingItem['customized_nutrients']?['carbs'] ?? 0;
      if (cals > 0) {
        final actualRatio = (carbs * 4) / cals;
        final maxRatio = (nc['carb_ratio_max'] as num).toDouble();
        if (actualRatio > maxRatio + 0.05) {
          return true;
        }
      }
    }

    return false;
  }

  // ── Confirm button availability ───────────────────────────────────────────

  /// Confirm Changes is enabled if user has a recipe selected OR is in AI mode (recipe == null).
  bool get _canConfirm {
    return _selectedRecipe != null || _editingItem['recipe'] == null;
  }

  @override
  Widget build(BuildContext context) {
    final isAI = _editingItem['recipe'] == null && _selectedRecipe == null;
    final macros = _editingItem['customized_nutrients'] ?? _editingItem['base_nutrients'];
    final currentMealType = (_editingItem['meal_type'] ?? 'LUNCH').toString();
    final isViolated = _editingItem['macro_violation'] == true || _checkClientViolation();

    return Container(
      padding: const EdgeInsets.all(24),
      height: MediaQuery.of(context).size.height * 0.85,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Header ────────────────────────────────────────────────────────
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Adjust Meal', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              IconButton(
                icon: const Icon(Icons.close),
                onPressed: () => Navigator.pop(context),
              )
            ],
          ),
          const SizedBox(height: 16),

          // ── Live Macro Preview ─────────────────────────────────────────────
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: Colors.blue[50], borderRadius: BorderRadius.circular(12)),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _macroPreview('Calories', '${macros?['calories'] ?? 0}', Colors.orange),
                _macroPreview('Protein', '${macros?['protein'] ?? 0}g', Colors.red),
                _macroPreview('Carbs', '${macros?['carbs'] ?? 0}g', Colors.green),
                _macroPreview('Fat', '${macros?['fat'] ?? 0}g', Colors.purple),
              ],
            ),
          ),
          if (isViolated) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.amber.shade50,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.amber.shade400),
              ),
              child: Row(
                children: [
                  Icon(Icons.warning_amber_rounded, size: 18, color: Colors.amber[900]),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Warning: This meal violates the client\'s medical condition constraints.',
                      style: TextStyle(fontSize: 12, color: Colors.amber[950], fontWeight: FontWeight.w500),
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 16),

          // ── Meal Type Dropdown ─────────────────────────────────────────────
          DropdownButtonFormField<String>(
            initialValue: currentMealType,
            decoration: const InputDecoration(
              labelText: 'Meal Type',
              border: OutlineInputBorder(),
              contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            ),
            items: ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'].map((String value) {
              return DropdownMenuItem<String>(value: value, child: Text(value));
            }).toList(),
            onChanged: (newValue) {
              setState(() { _editingItem['meal_type'] = newValue; });
            },
          ),
          const SizedBox(height: 12),

          // ── Recipe Picker (replaces old "Recipe ID" TextFormField) ─────────
          _RecipePickerInline(
            selectedRecipe: _selectedRecipe,
            currentMealType: currentMealType,
            onRecipeSelected: _onRecipeSelected,
            onClearSelection: _onClearSelection,
          ),
          const SizedBox(height: 12),

          // ── Portion Weight / Serving (g) Field (Read-only) ────────────────
          TextFormField(
            controller: _servingsController,
            readOnly: true,
            decoration: InputDecoration(
              labelText: 'Portion Weight (grams)',
              helperText: isAI
                  ? 'Total weight calculated from ingredients'
                  : 'Original weight of 1 serving: ${((_editingItem['base_weight'] as num?) ?? 100).round()}g (${_baseNutrition?['calories'] ?? 0} kcal)',
              border: const OutlineInputBorder(),
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
              suffixText: 'g',
              filled: true,
              fillColor: Colors.grey[100],
            ),
          ),
          const SizedBox(height: 12),

          // ── Ingredients section ───────────────────────────────────────────
          if (isAI && _editingItem['custom_ingredients'] != null) ...[
            const Text('Ingredients (AI Customized)', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Expanded(
              child: ListView.separated(
                itemCount: (_editingItem['custom_ingredients'] as List).length,
                separatorBuilder: (context, index) => const Divider(),
                itemBuilder: (context, index) {
                  final ci = _editingItem['custom_ingredients'][index];
                  final ing = ci['ingredient'] ?? {};
                  return Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(child: Text(ing['name'] ?? 'Unknown', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500))),
                      Row(
                        children: [
                          IconButton(
                            icon: const Icon(Icons.remove_circle_outline, color: Colors.grey),
                            onPressed: () {
                              if (ci['amount_gram'] > 10) {
                                setState(() { ci['amount_gram'] -= 10; });
                                _recalculateLocalMacros();
                              }
                            },
                          ),
                          SizedBox(
                            width: 50,
                            child: Text('${ci['amount_gram']}g', textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.bold)),
                          ),
                          IconButton(
                            icon: const Icon(Icons.add_circle_outline, color: Colors.blue),
                            onPressed: () {
                              setState(() { ci['amount_gram'] += 10; });
                              _recalculateLocalMacros();
                            },
                          ),
                        ],
                      )
                    ],
                  );
                },
              ),
            ),
          ] else if (!isAI && _editingItem['ingredients'] != null && (_editingItem['ingredients'] as List).isNotEmpty) ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Recipe Ingredients', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                Text(
                  '${(_editingItem['ingredients'] as List).length} items',
                  style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Expanded(
              child: ListView.separated(
                itemCount: (_editingItem['ingredients'] as List).length,
                separatorBuilder: (context, index) => const Divider(height: 1),
                itemBuilder: (context, index) {
                  final ing = _editingItem['ingredients'][index];
                  final String ingName = ing['name'] ?? ing['ingredient']?['name'] ?? 'Ingredient';
                  final num qty = ing['quantity'] ?? ing['amount_gram'] ?? ing['base_quantity'] ?? 0;
                  final String unit = ing['unit'] ?? 'g';
                  final String qtyText = (qty % 1 == 0) ? qty.round().toString() : qty.toStringAsFixed(1);

                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            ingName,
                            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500),
                          ),
                        ),
                        Row(
                          children: [
                            IconButton(
                              icon: const Icon(Icons.remove_circle_outline, color: Colors.grey),
                              onPressed: () {
                                if (qty > 5) {
                                  final num newQty = qty > 10 ? qty - 10 : qty - 1;
                                  if (ing['quantity'] != null) {
                                    ing['quantity'] = newQty;
                                  } else {
                                    ing['amount_gram'] = newQty;
                                  }
                                  _recalculatePortionFromRecipeIngredients();
                                }
                              },
                            ),
                            Container(
                              width: 65,
                              alignment: Alignment.center,
                              child: Text(
                                '$qtyText $unit',
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.blue,
                                ),
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.add_circle_outline, color: Colors.blue),
                              onPressed: () {
                                final num newQty = qty + 10;
                                if (ing['quantity'] != null) {
                                  ing['quantity'] = newQty;
                                } else {
                                  ing['amount_gram'] = newQty;
                                }
                                _recalculatePortionFromRecipeIngredients();
                              },
                            ),
                          ],
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
          ] else
            const Spacer(),

          // ── Confirm Changes ───────────────────────────────────────────────
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                backgroundColor: _canConfirm ? Colors.blue[600] : Colors.grey[300],
                foregroundColor: _canConfirm ? Colors.white : Colors.grey[500],
                elevation: _canConfirm ? 2 : 0,
              ),
              onPressed: _canConfirm
                  ? () {
                      widget.onSave(_editingItem);
                      Navigator.pop(context);
                    }
                  : null,
              child: const Text('Confirm Changes', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            ),
          )
        ],
      ),
    );
  }

  Widget _macroPreview(String label, String val, MaterialColor color) {
    return Column(
      children: [
        Text(label, style: TextStyle(color: Colors.grey[600], fontSize: 12)),
        const SizedBox(height: 4),
        Text(val, style: TextStyle(color: color[800], fontWeight: FontWeight.bold, fontSize: 16)),
      ],
    );
  }
}

// ════════════════════════════════════════════════════════════════════════════
// _RecipePickerInline — Recipe picker embedded in the bottom sheet.
// Shows selected recipe preview or a tap-to-open placeholder.
// When tapped → opens _RecipeSearchSheet.
// ════════════════════════════════════════════════════════════════════════════
class _RecipePickerInline extends StatelessWidget {
  final Map<String, dynamic>? selectedRecipe;
  final String currentMealType;
  final void Function(Map<String, dynamic>) onRecipeSelected;
  final VoidCallback onClearSelection;

  const _RecipePickerInline({
    required this.selectedRecipe,
    required this.currentMealType,
    required this.onRecipeSelected,
    required this.onClearSelection,
  });

  @override
  Widget build(BuildContext context) {
    final hasRecipe = selectedRecipe != null;
    final nutrition = hasRecipe ? (selectedRecipe!['nutrition'] as Map?) : null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Select Recipe',
              style: TextStyle(
                color: Colors.grey[600],
                fontWeight: FontWeight.w600,
                fontSize: 12,
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        GestureDetector(
          onTap: () => _openSearchSheet(context),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              border: Border.all(
                color: hasRecipe ? Colors.blue[400]! : Colors.grey[400]!,
                width: hasRecipe ? 1.5 : 1.0,
              ),
              borderRadius: BorderRadius.circular(12),
              color: hasRecipe ? Colors.blue[50] : Colors.grey[50],
            ),
            child: hasRecipe
                ? _SelectedRecipeRow(recipe: selectedRecipe!, nutrition: nutrition)
                : _PickerPlaceholder(),
          ),
        ),
      ],
    );
  }

  void _openSearchSheet(BuildContext context) {
    // Trigger initial load (by meal type) before sheet opens
    context.read<NutritionistProvider>().searchRecipesForSwap(
          mealType: currentMealType,
          reset: true,
        );

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => ChangeNotifierProvider.value(
        value: context.read<NutritionistProvider>(),
        child: _RecipeSearchSheet(
          initialMealType: currentMealType,
          onRecipeSelected: (recipe) {
            onRecipeSelected(recipe);
            Navigator.pop(context);
          },
        ),
      ),
    ).whenComplete(() {
      if (context.mounted) {
        context.read<NutritionistProvider>().clearRecipeSearch();
      }
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────

class _SelectedRecipeRow extends StatelessWidget {
  final Map<String, dynamic> recipe;
  final Map? nutrition;

  const _SelectedRecipeRow({required this.recipe, this.nutrition});

  @override
  Widget build(BuildContext context) {
    final imageUrl = recipe['imageUrl'] as String? ?? '';
    final name = recipe['name'] as String? ?? 'Unknown recipe';
    final cal = (nutrition?['calories'] as num?)?.round() ?? 0;
    final pro = (nutrition?['protein'] as num?)?.toStringAsFixed(1) ?? '0';
    final carb = (nutrition?['carbs'] as num?)?.toStringAsFixed(1) ?? '0';
    final fat = (nutrition?['fat'] as num?)?.toStringAsFixed(1) ?? '0';

    return Row(
      children: [
        // Thumbnail
        ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: imageUrl.isNotEmpty
              ? Image.network(
                  imageUrl,
                  width: 48,
                  height: 48,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => _ThumbPlaceholder(size: 48),
                )
              : _ThumbPlaceholder(size: 48),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                name,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 4),
              Wrap(
                spacing: 4,
                children: [
                  _Badge('${cal}kcal', Colors.orange[700]!),
                  _Badge('P:${pro}g', Colors.red[600]!),
                  _Badge('C:${carb}g', Colors.green[600]!),
                  _Badge('F:${fat}g', Colors.purple[600]!),
                ],
              ),
            ],
          ),
        ),
        Icon(Icons.swap_horiz, color: Colors.blue[400], size: 20),
      ],
    );
  }
}

class _PickerPlaceholder extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(Icons.restaurant_menu, color: Colors.grey[400], size: 26),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            'Click to sreach and select recipe',
            style: TextStyle(color: Colors.grey[500], fontSize: 13),
          ),
        ),
        Icon(Icons.search, color: Colors.grey[400], size: 20),
      ],
    );
  }
}

class _Badge extends StatelessWidget {
  final String label;
  final Color color;
  const _Badge(this.label, this.color);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(label, style: TextStyle(fontSize: 10, color: color, fontWeight: FontWeight.w600)),
    );
  }
}

class _ThumbPlaceholder extends StatelessWidget {
  final double size;
  const _ThumbPlaceholder({required this.size});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: Colors.grey[200],
        borderRadius: BorderRadius.circular(8),
      ),
      child: Icon(Icons.restaurant, color: Colors.grey[400], size: size * 0.5),
    );
  }
}

// ════════════════════════════════════════════════════════════════════════════
// _RecipeSearchSheet — full-screen search bottom sheet
// ════════════════════════════════════════════════════════════════════════════
class _RecipeSearchSheet extends StatefulWidget {
  final String initialMealType;
  final void Function(Map<String, dynamic> recipe) onRecipeSelected;

  const _RecipeSearchSheet({
    required this.initialMealType,
    required this.onRecipeSelected,
  });

  @override
  State<_RecipeSearchSheet> createState() => _RecipeSearchSheetState();
}

class _RecipeSearchSheetState extends State<_RecipeSearchSheet> {
  final TextEditingController _searchController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  Timer? _debounce;
  late String _activeMealType;
  String _lastQuery = '';

  static const List<String> _mealTypes = ['', 'BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];
  static const Map<String, String> _mealTypeLabels = {
    '':          'All',
    'BREAKFAST' : 'BREAKFAST',
    'LUNCH': 'LUNCH'   ,
    'DINNER': 'DINNER'  ,
    'SNACK': 'SNACK'  ,
  };

  @override
  void initState() {
    super.initState();
    _activeMealType = widget.initialMealType;
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _onSearchChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), () {
      if (value != _lastQuery) {
        _lastQuery = value;
        _triggerSearch(reset: true);
      }
    });
  }

  void _onMealTypeChanged(String type) {
    setState(() => _activeMealType = type);
    _triggerSearch(reset: true);
  }

  void _triggerSearch({bool reset = true}) {
    context.read<NutritionistProvider>().searchRecipesForSwap(
          query: _searchController.text,
          mealType: _activeMealType,
          reset: reset,
        );
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      context.read<NutritionistProvider>().loadMoreRecipes(
            query: _searchController.text,
            mealType: _activeMealType,
          );
    }
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.92,
      maxChildSize: 0.95,
      minChildSize: 0.55,
      builder: (context, _) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          children: [
            // Drag handle
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey[300],
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
            ),
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 8, 0),
              child: Row(
                children: [
                  const Text('Search recipe', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
            // Search bar
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: StatefulBuilder(
                builder: (ctx, setLocal) => TextField(
                  controller: _searchController,
                  autofocus: true,
                  onChanged: (v) {
                    setLocal(() {});
                    _onSearchChanged(v);
                  },
                  decoration: InputDecoration(
                    hintText: 'Sreach recipe',
                    prefixIcon: const Icon(Icons.search, size: 20),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, size: 18),
                            onPressed: () {
                              _searchController.clear();
                              setLocal(() {});
                              _onSearchChanged('');
                            },
                          )
                        : null,
                    filled: true,
                    fillColor: Colors.grey[100],
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                    contentPadding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
                  ),
                ),
              ),
            ),
            // Meal type chip row
            SizedBox(
              height: 44,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
                itemCount: _mealTypes.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (context, i) {
                  final type = _mealTypes[i];
                  final isActive = _activeMealType == type;
                  return GestureDetector(
                    onTap: () => _onMealTypeChanged(type),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 180),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                      decoration: BoxDecoration(
                        color: isActive ? Colors.blue[600] : Colors.grey[100],
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: isActive ? Colors.blue[600]! : Colors.grey[300]!,
                        ),
                      ),
                      child: Text(
                        _mealTypeLabels[type] ?? type,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: isActive ? Colors.white : Colors.grey[700],
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
            const Divider(height: 1),
            // Results list
            Expanded(
              child: Consumer<NutritionistProvider>(
                builder: (context, provider, _) {
                  // Loading first page
                  if (provider.isSearchingRecipes && provider.recipeSearchResults.isEmpty) {
                    return _buildSkeletons();
                  }
                  // Error with no results
                  if (provider.recipeSearchError != null && provider.recipeSearchResults.isEmpty) {
                    return _buildError(provider.recipeSearchError!, context);
                  }
                  // Empty state
                  if (provider.recipeSearchResults.isEmpty) {
                    return _buildEmpty();
                  }
                  // Results + optional load-more spinner
                  return ListView.separated(
                    controller: _scrollController,
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
                    itemCount: provider.recipeSearchResults.length +
                        (provider.hasMoreRecipes ? 1 : 0),
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (context, index) {
                      if (index >= provider.recipeSearchResults.length) {
                        return const Center(
                          child: Padding(
                            padding: EdgeInsets.all(16),
                            child: CircularProgressIndicator(strokeWidth: 2),
                          ),
                        );
                      }
                      final recipe = provider.recipeSearchResults[index];
                      return _RecipeCard(
                        recipe: recipe,
                        onSelect: () => widget.onRecipeSelected(recipe),
                      );
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSkeletons() {
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
      itemCount: 5,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (_, __) => Container(
        height: 88,
        decoration: BoxDecoration(
          color: Colors.grey[200],
          borderRadius: BorderRadius.circular(14),
        ),
      ),
    );
  }

  Widget _buildEmpty() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.search_off, size: 64, color: Colors.grey[300]),
            const SizedBox(height: 16),
            Text(
              _searchController.text.isEmpty
                  ? 'No matching recipes found.'
                  : 'No results for\n"${_searchController.text}"',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey[500], fontSize: 15),
            ),
            const SizedBox(height: 8),
            Text(
              'Try different keywords or clear the meal type filter.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey[400], fontSize: 13),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildError(String error, BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.wifi_off_outlined, size: 48, color: Colors.grey[400]),
            const SizedBox(height: 12),
            const Text('Failed to load recipe list', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text(error, style: TextStyle(color: Colors.grey[400], fontSize: 12), textAlign: TextAlign.center),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: () => _triggerSearch(reset: true),
              icon: const Icon(Icons.refresh, size: 18),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────

class _RecipeCard extends StatelessWidget {
  final Map<String, dynamic> recipe;
  final VoidCallback onSelect;

  const _RecipeCard({required this.recipe, required this.onSelect});

  @override
  Widget build(BuildContext context) {
    final name = recipe['name'] as String? ?? '';
    final imageUrl = recipe['imageUrl'] as String? ?? '';
    final nutrition = recipe['nutrition'] as Map? ?? {};
    final cal = (nutrition['calories'] as num?)?.round() ?? 0;
    final pro = (nutrition['protein'] as num?)?.toStringAsFixed(1) ?? '0';
    final carb = (nutrition['carbs'] as num?)?.toStringAsFixed(1) ?? '0';
    final fat = (nutrition['fat'] as num?)?.toStringAsFixed(1) ?? '0';
    final cookTime = recipe['cookingTime'] as int? ?? 0;

    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(14),
      elevation: 1,
      shadowColor: Colors.black12,
      child: InkWell(
        onTap: onSelect,
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Row(
            children: [
              // Thumbnail
              ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: imageUrl.isNotEmpty
                    ? Image.network(
                        imageUrl,
                        width: 64,
                        height: 64,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => _ThumbPlaceholder(size: 64),
                      )
                    : _ThumbPlaceholder(size: 64),
              ),
              const SizedBox(width: 12),
              // Info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 5),
                    Wrap(
                      spacing: 4,
                      runSpacing: 4,
                      children: [
                        _Badge('${cal}kcal', Colors.orange[700]!),
                        _Badge('P:${pro}g', Colors.red[600]!),
                        _Badge('C:${carb}g', Colors.green[600]!),
                        _Badge('F:${fat}g', Colors.purple[600]!),
                      ],
                    ),
                    if (cookTime > 0) ...[
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Icon(Icons.timer_outlined, size: 11, color: Colors.grey[500]),
                          const SizedBox(width: 3),
                          Text(
                            '$cookTime min',
                            style: TextStyle(fontSize: 11, color: Colors.grey[500]),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 8),
              // Select button
              ElevatedButton(
                onPressed: onSelect,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blue[600],
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  minimumSize: Size.zero,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  elevation: 0,
                ),
                child: const Text('Select', style: TextStyle(fontSize: 13)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

