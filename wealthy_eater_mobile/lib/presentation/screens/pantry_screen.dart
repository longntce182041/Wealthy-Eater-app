import 'dart:io';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_colors.dart';
import '../../data/models/pantry_model.dart';
import '../providers/pantry_provider.dart';
import 'pantry_suggestions_screen.dart';

class PantryScreen extends StatefulWidget {
  final bool showAppBar;

  const PantryScreen({super.key, this.showAppBar = true});

  @override
  State<PantryScreen> createState() => _PantryScreenState();
}

class _PantryScreenState extends State<PantryScreen> {
  final TextEditingController _searchController = TextEditingController();
  bool _showAllAvailable = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<PantryProvider>().fetchPantry();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<PantryProvider>();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: widget.showAppBar
          ? AppBar(
              title: const Text('Virtual Fridge'),
              centerTitle: true,
            )
          : null,
      body: Column(
        children: [
          Expanded(
            child: RefreshIndicator(
              onRefresh: () => provider.fetchPantry(),
              child: ListView(
                padding: const EdgeInsets.all(16.0),
                children: [
                  // ── AI Recipe Suggestions Card ──
                  _buildAiSuggestionsCard(context, provider),
                  const SizedBox(height: 20),

                  // ── Section 1: AI Camera Scan ──
                  _buildCameraScanSection(context, provider),
                  const SizedBox(height: 24),

                  // ── Section 2: Manual Ingredients Form (Fridge Inventory) ──
                  _buildManualFormSection(context, provider),
                  const SizedBox(height: 24),

                  // ── Section 3: Ingredient Grid Picker with Search (Max 9 items) ──
                  _buildIngredientPickerSection(context, provider),
                  const SizedBox(height: 80), // spacer for bottom action button
                ],
              ),
            ),
          ),
          
          // ── Fixed Bottom Save Button ──
          if (provider.tempIngredients.isNotEmpty)
            _buildBottomSaveAction(context, provider),
        ],
      ),
    );
  }

  // ── AI Recipe Suggestions Card ────────────────────────────────────────────────

  Widget _buildAiSuggestionsCard(BuildContext context, PantryProvider provider) {
    if (provider.ingredients.isEmpty) {
      return const SizedBox.shrink();
    }

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.primary,
            AppColors.primary.withValues(alpha: 0.85),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.25),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.auto_awesome_rounded,
                  color: Colors.white,
                  size: 24,
                ),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'AI Meal Assistant',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      'Get recipe ideas from your current ingredients',
                      style: TextStyle(
                        color: Colors.white70,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: provider.isLoadingSuggestions
                  ? null
                  : () {
                      if (provider.suggestedRecipes.isEmpty || provider.isPantryChangedSinceLastSuggestion) {
                        provider.suggestMeals();
                      }
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (context) => const PantrySuggestionsScreen(),
                        ),
                      );
                    },
              icon: provider.isLoadingSuggestions
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: AppColors.primary,
                      ),
                    )
                  : const Icon(Icons.restaurant_menu_rounded, size: 18),
              label: Text(
                provider.isLoadingSuggestions
                    ? 'Crafting Recipes...'
                    : (provider.suggestedRecipes.isNotEmpty && !provider.isPantryChangedSinceLastSuggestion)
                        ? 'View AI Recipes (${provider.suggestedRecipes.length})'
                        : 'Generate AI Recipes',
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: AppColors.primary,
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // Section 1: AI Camera Scan ──────────────────────────────────────────────

  Widget _buildCameraScanSection(BuildContext context, PantryProvider provider) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.border),
        boxShadow: const [
          BoxShadow(
            color: Color(0x06000000),
            blurRadius: 10,
            offset: Offset(0, 4),
          )
        ],
      ),
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.center_focus_strong_rounded, color: AppColors.primary, size: 22),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  'AI Fridge Scanner',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          const Text(
            'Snap a photo of your fridge or grocery items to automatically identify ingredients.',
            style: TextStyle(fontSize: 12, color: AppColors.textTertiary),
          ),
          const SizedBox(height: 16),

          if (provider.scannedImagePath != null) ...[
            ClipRRect(
              borderRadius: BorderRadius.circular(14),
              child: SizedBox(
                height: 160,
                width: double.infinity,
                child: kIsWeb
                    ? Image.network(
                        provider.scannedImagePath!,
                        fit: BoxFit.cover,
                      )
                    : Image.file(
                        File(provider.scannedImagePath!),
                        fit: BoxFit.cover,
                      ),
              ),
            ),
            const SizedBox(height: 12),
          ],

          Row(
            children: [
              if (provider.supportsCameraSource) ...[
                Expanded(
                  child: _ScanOptionButton(
                    icon: Icons.camera_alt_rounded,
                    label: 'Take Photo',
                    color: AppColors.primary,
                    onTap: () => provider.pickAndScanPantry(ImageSource.camera),
                  ),
                ),
                const SizedBox(width: 12),
              ],
              Expanded(
                child: _ScanOptionButton(
                  icon: Icons.photo_library_rounded,
                  label: 'Choose Gallery',
                  color: AppColors.secondary,
                  onTap: () => provider.pickAndScanPantry(ImageSource.gallery),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ── Section 3: Ingredient Grid Picker with Dedicated Search (Max 9 items) ──

  Widget _buildIngredientPickerSection(BuildContext context, PantryProvider provider) {
    // Get existing ingredient names in current form/fridge (case-insensitive)
    final existingNames = provider.tempIngredients
        .map((e) => e.name.trim().toLowerCase())
        .where((name) => name.isNotEmpty)
        .toSet();

    final query = _searchController.text.trim().toLowerCase();

    // Filter master ingredients: exclude items already added to fridge
    final availableIngredients = provider.masterIngredients.where((item) {
      final name = (item['name'] as String? ?? '').trim().toLowerCase();
      if (name.isEmpty || existingNames.contains(name)) {
        return false;
      }
      if (query.isNotEmpty) {
        return name.contains(query);
      }
      return true;
    }).toList();

    final totalAvailableCount = availableIngredients.length;
    final displayedIngredients = (_showAllAvailable || query.isNotEmpty)
        ? availableIngredients
        : availableIngredients.take(9).toList();

    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.border),
        boxShadow: const [
          BoxShadow(
            color: Color(0x06000000),
            blurRadius: 10,
            offset: Offset(0, 4),
          )
        ],
      ),
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.add_shopping_cart_rounded, color: AppColors.primary, size: 22),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Available Ingredients',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          const Text(
            'Tap any ingredient card to quickly add it to your Virtual Fridge',
            style: TextStyle(fontSize: 12, color: AppColors.textTertiary),
          ),
          const SizedBox(height: 14),

          // Search Field
          TextField(
            controller: _searchController,
            onChanged: (_) {
              setState(() {});
            },
            style: const TextStyle(fontSize: 13, color: AppColors.textPrimary),
            decoration: InputDecoration(
              hintText: 'Search ingredients to add...',
              hintStyle: const TextStyle(fontSize: 13, color: AppColors.textTertiary),
              prefixIcon: const Icon(Icons.search_rounded, size: 20, color: AppColors.textTertiary),
              suffixIcon: _searchController.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.close_rounded, size: 18),
                      onPressed: () {
                        _searchController.clear();
                        setState(() {});
                      },
                    )
                  : null,
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              filled: true,
              fillColor: AppColors.background,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppColors.border),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppColors.border),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppColors.primary),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Grid View (3 items per row, max 9 items initially)
          if (availableIngredients.isEmpty) ...[
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 20),
              child: Center(
                child: Column(
                  children: [
                    Icon(
                      query.isNotEmpty ? Icons.search_off_rounded : Icons.check_circle_outline_rounded,
                      size: 40,
                      color: AppColors.textTertiary.withValues(alpha: 0.6),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      query.isNotEmpty
                          ? 'No ingredients match "$query"'
                          : 'All available ingredients are already in your fridge!',
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                    ),
                  ],
                ),
              ),
            ),
          ] else ...[
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: displayedIngredients.length,
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 3,
                crossAxisSpacing: 8,
                mainAxisSpacing: 8,
                childAspectRatio: 0.72,
              ),
              itemBuilder: (context, index) {
                final item = displayedIngredients[index];
                final String name = item['name'] as String? ?? '';
                final String imageUrl = item['image_url'] as String? ?? '';

                return InkWell(
                  onTap: () {
                    provider.addIngredientFromPicker(name);
                  },
                  borderRadius: BorderRadius.circular(14),
                  child: Container(
                    decoration: BoxDecoration(
                      color: AppColors.background,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppColors.border),
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // Image Thumbnail or Icon
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: imageUrl.isNotEmpty
                              ? Image.network(
                                  imageUrl,
                                  height: 36,
                                  width: 36,
                                  fit: BoxFit.cover,
                                  errorBuilder: (_, __, ___) => const Icon(
                                    Icons.restaurant_menu_rounded,
                                    size: 30,
                                    color: AppColors.primary,
                                  ),
                                )
                              : const Icon(
                                  Icons.restaurant_menu_rounded,
                                  size: 30,
                                  color: AppColors.primary,
                                ),
                        ),
                        const SizedBox(height: 4),

                        // Name
                        Text(
                          name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 4),

                        // Add Pill
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.add, size: 10, color: AppColors.primary),
                              SizedBox(width: 2),
                              Text(
                                'Add',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.primary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),

            if (totalAvailableCount > 9 && query.isEmpty) ...[
              const SizedBox(height: 12),
              Center(
                child: TextButton.icon(
                  onPressed: () {
                    setState(() {
                      _showAllAvailable = !_showAllAvailable;
                    });
                  },
                  icon: Icon(
                    _showAllAvailable ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded,
                    size: 18,
                  ),
                  label: Text(
                    _showAllAvailable
                        ? 'Show Less'
                        : 'Show More (${totalAvailableCount - 9} remaining)',
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.primary),
                  ),
                ),
              ),
            ],
          ],
        ],
      ),
    );
  }

  // ── Section 3: Manual Ingredients Form ─────────────────────────────────────

  Widget _buildManualFormSection(BuildContext context, PantryProvider provider) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.border),
        boxShadow: const [
          BoxShadow(
            color: Color(0x06000000),
            blurRadius: 10,
            offset: Offset(0, 4),
          )
        ],
      ),
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Row(
                  children: [
                    const Icon(Icons.inventory_2_rounded, color: AppColors.primary, size: 22),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Fridge Inventory (${provider.tempIngredients.length})',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              TextButton.icon(
                onPressed: () => provider.addTempRow(),
                icon: const Icon(Icons.add_circle_outline_rounded, size: 16),
                label: const Text('Add Row'),
                style: TextButton.styleFrom(
                  foregroundColor: AppColors.primary,
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              ),
            ],
          ),
          const Divider(height: 24),

          if (provider.tempIngredients.isEmpty) ...[
            Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 16),
                child: Column(
                  children: [
                    Icon(
                      Icons.kitchen_outlined,
                      size: 64,
                      color: AppColors.textTertiary.withValues(alpha: 0.5),
                    ),
                    const SizedBox(height: 14),
                    const Text(
                      'Your Virtual Fridge is empty',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Tap available ingredients above or press "Add Blank Row" to populate your fridge.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 12,
                        color: AppColors.textTertiary,
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ] else ...[
            Column(
              children: List.generate(provider.tempIngredients.length, (index) {
                final item = provider.tempIngredients[index];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12.0),
                  child: _IngredientRow(
                    item: item,
                    onChanged: (updatedItem) {
                      provider.updateTempRow(index, updatedItem);
                    },
                    onDelete: () {
                      provider.removeTempRow(index);
                    },
                  ),
                );
              }),
            ),
          ],
        ],
      ),
    );
  }

  // ── Save bottom sheet/button ───────────────────────────────────────────────

  Widget _buildBottomSaveAction(BuildContext context, PantryProvider provider) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        border: const Border(top: BorderSide(color: AppColors.border)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, -4),
          )
        ],
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          width: double.infinity,
          height: 52,
          child: ElevatedButton.icon(
            onPressed: provider.isLoading
                ? null
                : () async {
                    await provider.savePantry();
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Virtual Fridge saved successfully!'),
                          backgroundColor: AppColors.primary,
                        ),
                      );
                    }
                  },
            icon: provider.isLoading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Icon(Icons.cloud_upload_rounded, color: Colors.white),
            label: Text(
              provider.isLoading ? 'Saving...' : 'Save Virtual Fridge',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ── Helper Button Widget for Scan Options ────────────────────────────────────

class _ScanOptionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _ScanOptionButton({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withValues(alpha: 0.2)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 20, color: color),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Ingredient Form Row Widget ──────────────────────────────────────────────

class _IngredientRow extends StatefulWidget {
  final PantryIngredient item;
  final Function(PantryIngredient) onChanged;
  final VoidCallback onDelete;

  const _IngredientRow({
    required this.item,
    required this.onChanged,
    required this.onDelete,
  });

  @override
  State<_IngredientRow> createState() => _IngredientRowState();
}

class _IngredientRowState extends State<_IngredientRow> {
  late TextEditingController _nameController;
  late TextEditingController _qtyController;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.item.name);
    _qtyController = TextEditingController(
      text: widget.item.quantity == 0.0 ? '' : widget.item.quantity.toString(),
    );
  }

  @override
  void didUpdateWidget(covariant _IngredientRow oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.item.name != widget.item.name) {
      _nameController.text = widget.item.name;
    }
    final parsedQty = double.tryParse(_qtyController.text) ?? 0.0;
    if (parsedQty != widget.item.quantity) {
      _qtyController.text = widget.item.quantity == 0.0 ? '' : widget.item.quantity.toString();
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _qtyController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          // Row 1: Name Field & Delete Button
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _nameController,
                  style: const TextStyle(fontSize: 13, color: AppColors.textPrimary, fontWeight: FontWeight.w600),
                  decoration: InputDecoration(
                    hintText: 'Ingredient Name',
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: const BorderSide(color: AppColors.border),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: const BorderSide(color: AppColors.border),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: const BorderSide(color: AppColors.primary),
                    ),
                  ),
                  onChanged: (val) {
                    widget.onChanged(widget.item.copyWith(name: val));
                  },
                ),
              ),
              IconButton(
                onPressed: widget.onDelete,
                icon: const Icon(Icons.delete_outline_rounded, color: AppColors.error, size: 20),
                padding: const EdgeInsets.all(4),
                constraints: const BoxConstraints(),
              ),
            ],
          ),
          const SizedBox(height: 8),

          // Row 2: Qty Field & Unit Dropdown
          Row(
            children: [
              Expanded(
                flex: 1,
                child: TextField(
                  controller: _qtyController,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  style: const TextStyle(fontSize: 13, color: AppColors.textPrimary),
                  decoration: InputDecoration(
                    hintText: 'Quantity',
                    labelText: 'Qty',
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: const BorderSide(color: AppColors.border),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: const BorderSide(color: AppColors.border),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: const BorderSide(color: AppColors.primary),
                    ),
                  ),
                  onChanged: (val) {
                    final double? parsed = double.tryParse(val);
                    if (parsed != null) {
                      widget.onChanged(widget.item.copyWith(quantity: parsed));
                    } else if (val.isEmpty) {
                      widget.onChanged(widget.item.copyWith(quantity: 0.0));
                    }
                  },
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                flex: 1,
                child: DropdownButtonFormField<String>(
                  key: ValueKey('${widget.item.name}_${widget.item.unit}'),
                  initialValue: widget.item.unit.isEmpty ? 'g' : widget.item.unit,
                  style: const TextStyle(fontSize: 13, color: AppColors.textPrimary),
                  decoration: InputDecoration(
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: const BorderSide(color: AppColors.border),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: const BorderSide(color: AppColors.border),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: const BorderSide(color: AppColors.primary),
                    ),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'g', child: Text('g')),
                    DropdownMenuItem(value: 'ml', child: Text('ml')),
                    DropdownMenuItem(value: 'pieces', child: Text('pcs')),
                    DropdownMenuItem(value: 'units', child: Text('unit')),
                  ],
                  onChanged: (val) {
                    if (val != null) {
                      widget.onChanged(widget.item.copyWith(unit: val));
                    }
                  },
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
