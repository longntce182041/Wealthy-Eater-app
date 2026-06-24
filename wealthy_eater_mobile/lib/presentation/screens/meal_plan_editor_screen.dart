import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
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
      List<IngredientUpdate>? ingredients;
      if (item['custom_ingredients'] != null) {
        ingredients = (item['custom_ingredients'] as List).map((ing) {
          return IngredientUpdate(
            ingredientId: ing['ingredient']['_id'],
            grams: ing['amount_gram'],
          );
        }).toList();
      }
      
      return DraftItemUpdate(
        itemId: item['_id'],
        recipeId: item['recipe']?['_id'],
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
          onSave: (updatedItem) {
            setState(() {
              (_localDraft!['items'] as List)[index] = updatedItem;
              _recalculateTotals();
            });
          },
        ),
      ),
    );
  }

  void _recalculateTotals() {
    if (_localDraft == null) return;
    
    // In a real scenario, totals might also be recalculated locally to show the immediate effect on the whole plan
    // For this UI, the backend will recalculate and return it upon Save.
    // However, the prompt asks for real-time calculation. The bottom sheet handles item-level calculation.
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

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: items.length,
      separatorBuilder: (context, index) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final item = items[index];
        final isAI = item['recipe'] == null;
        final name = isAI ? "AI Customized Meal" : item['recipe']['name'];
        final macros = item['customized_nutrients'] ?? item['base_nutrients'];

        return Card(
          elevation: 2,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(item['meal_type'] ?? 'LUNCH', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blue[800])),
                        const SizedBox(height: 4),
                        Text(name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    IconButton(
                      icon: const Icon(Icons.edit, color: Colors.blue),
                      onPressed: () => _openEditBottomSheet(item, index),
                    ),
                  ],
                ),
                const Divider(),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _macroWidget('Cal', '${macros['calories']} kcal', Colors.orange),
                    _macroWidget('Pro', '${macros['protein']}g', Colors.red),
                    _macroWidget('Carb', '${macros['carbs']}g', Colors.green),
                    _macroWidget('Fat', '${macros['fat']}g', Colors.purple),
                  ],
                )
              ],
            ),
          ),
        );
      },
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

class _EditItemBottomSheet extends StatefulWidget {
  final Map<String, dynamic> item;
  final Function(Map<String, dynamic>) onSave;

  const _EditItemBottomSheet({required this.item, required this.onSave});

  @override
  State<_EditItemBottomSheet> createState() => _EditItemBottomSheetState();
}

class _EditItemBottomSheetState extends State<_EditItemBottomSheet> {
  late Map<String, dynamic> _editingItem;

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
  }

  void _recalculateLocalMacros() {
    if (_editingItem['custom_ingredients'] == null) return;
    
    double totalCal = 0;
    double totalPro = 0;
    double totalCarb = 0;
    double totalFat = 0;

    for (var ci in _editingItem['custom_ingredients']) {
      final ing = ci['ingredient'];
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
    });
  }

  @override
  Widget build(BuildContext context) {
    final isAI = _editingItem['recipe'] == null;
    final macros = _editingItem['customized_nutrients'] ?? _editingItem['base_nutrients'];

    return Container(
      padding: const EdgeInsets.all(24),
      height: MediaQuery.of(context).size.height * 0.7,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
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
          // Live Macro Preview
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: Colors.blue[50], borderRadius: BorderRadius.circular(12)),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _macroPreview('Calories', '${macros['calories']}', Colors.orange),
                _macroPreview('Protein', '${macros['protein']}g', Colors.red),
                _macroPreview('Carbs', '${macros['carbs']}g', Colors.green),
                _macroPreview('Fat', '${macros['fat']}g', Colors.purple),
              ],
            ),
          ),
          const SizedBox(height: 24),
          const Text('Ingredients', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          Expanded(
            child: isAI && _editingItem['custom_ingredients'] != null
                ? ListView.separated(
                    itemCount: (_editingItem['custom_ingredients'] as List).length,
                    separatorBuilder: (context, index) => const Divider(),
                    itemBuilder: (context, index) {
                      final ci = _editingItem['custom_ingredients'][index];
                      final ing = ci['ingredient'];
                      return Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(child: Text(ing['name'] ?? 'Unknown', style: const TextStyle(fontSize: 16))),
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
                  )
                : const Center(child: Text("Recipe swapping not fully implemented in UI yet.")),
          ),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                backgroundColor: Colors.blue[600],
              ),
              onPressed: () {
                widget.onSave(_editingItem);
                Navigator.pop(context);
              },
              child: const Text('Confirm Changes', style: TextStyle(fontSize: 16)),
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
