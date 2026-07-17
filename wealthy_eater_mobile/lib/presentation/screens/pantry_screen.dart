import 'dart:io';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_colors.dart';
import '../../data/models/pantry_model.dart';
import '../providers/pantry_provider.dart';

class PantryScreen extends StatefulWidget {
  const PantryScreen({super.key});

  @override
  State<PantryScreen> createState() => _PantryScreenState();
}

class _PantryScreenState extends State<PantryScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<PantryProvider>().fetchPantry();
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<PantryProvider>();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Virtual Fridge'),
        centerTitle: true,
      ),
      body: Column(
        children: [
          Expanded(
            child: RefreshIndicator(
              onRefresh: () => provider.fetchPantry(),
              child: ListView(
                padding: const EdgeInsets.all(16.0),
                children: [
                  // ── Section 1: AI Camera Scan ──
                  _buildCameraScanSection(context, provider),
                  const SizedBox(height: 24),

                  // ── Section 2: Manual Ingredients Form ──
                  _buildManualFormSection(context, provider),
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

  // ── AI Scanner Layout ────────────────────────────────────────────────────────

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
              Icon(Icons.photo_camera_rounded, color: AppColors.secondary, size: 24),
              SizedBox(width: 10),
              Text(
                'AI Fridge Scanner',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          const Text(
            'Quickly update your virtual fridge by taking a photo of your shelves. The AI will detect and map your food automatically.',
            style: TextStyle(fontSize: 13, color: AppColors.textSecondary, height: 1.4),
          ),
          const SizedBox(height: 20),

          // Scanning preview state
          if (provider.scannedImagePath != null) ...[
            Center(
              child: Stack(
                children: [
                  Container(
                    height: 200,
                    width: double.infinity,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.border, width: 1.5),
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(14),
                      child: kIsWeb
                          ? Image.network(
                              provider.scannedImagePath!,
                              fit: BoxFit.cover,
                              width: double.infinity,
                            )
                          : Image.file(
                              File(provider.scannedImagePath!),
                              fit: BoxFit.cover,
                              width: double.infinity,
                            ),
                    ),
                  ),
                  if (provider.isLoading)
                    const Positioned.fill(
                      child: ClipRRect(
                        borderRadius: BorderRadius.all(Radius.circular(16)),
                        child: _ScanningOverlay(),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],

          if (provider.isLoading && provider.scannedImagePath == null) ...[
            const Center(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 20),
                child: Column(
                  children: [
                    CircularProgressIndicator(),
                    SizedBox(height: 12),
                    Text('Detecting ingredients...', style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
          ],

          // Gradient Capture Options
          Row(
            children: [
              Expanded(
                child: _ScanOptionButton(
                  label: 'Camera',
                  icon: Icons.camera_enhance_rounded,
                  colors: const [AppColors.secondary, Color(0xFFC8600C)],
                  onTap: () => provider.pickAndScanPantry(ImageSource.camera),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _ScanOptionButton(
                  label: 'Gallery',
                  icon: Icons.photo_library_rounded,
                  colors: const [Color(0xFF0D9488), Color(0xFF0F766E)],
                  onTap: () => provider.pickAndScanPantry(ImageSource.gallery),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ── Manual Entry Form Layout ───────────────────────────────────────────────

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
              const Row(
                children: [
                  Icon(Icons.inventory_2_rounded, color: AppColors.primary, size: 24),
                  SizedBox(width: 10),
                  Text(
                    'Fridge Inventory',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ],
              ),
              TextButton.icon(
                onPressed: () => provider.addTempRow(),
                icon: const Icon(Icons.add_circle_outline_rounded, size: 18),
                label: const Text('Add Row'),
                style: TextButton.styleFrom(
                  foregroundColor: AppColors.primary,
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
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
                      'Press "Add Row" to enter ingredients manually or scan a photo to populate it automatically.',
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
            // Rows List
            Column(
              children: List.generate(provider.tempIngredients.length, (index) {
                final item = provider.tempIngredients[index];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12.0),
                  child: _IngredientRow(
                    item: item,
                    suggestions: provider.masterIngredientNames,
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
          child: ElevatedButton(
            onPressed: provider.isLoading
                ? null
                : () async {
                    await provider.savePantry();
                    if (!context.mounted) return;
                    if (provider.error != null) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(provider.error!),
                          backgroundColor: AppColors.error,
                        ),
                      );
                    } else {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Virtual fridge successfully updated!'),
                          backgroundColor: AppColors.success,
                          duration: Duration(seconds: 2),
                        ),
                      );
                    }
                  },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              elevation: 2,
            ),
            child: provider.isLoading
                ? const SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                  )
                : const Text(
                    'Save to Virtual Fridge',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
          ),
        ),
      ),
    );
  }
}

// ── Gradient Scan Trigger Button Widget ──────────────────────────────────────

class _ScanOptionButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final List<Color> colors;
  final VoidCallback onTap;

  const _ScanOptionButton({
    required this.label,
    required this.icon,
    required this.colors,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 48,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: colors,
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: colors.first.withValues(alpha: 0.25),
            blurRadius: 8,
            offset: const Offset(0, 3),
          )
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(14),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: Colors.white, size: 20),
              const SizedBox(width: 8),
              Text(
                label,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Laser Scanning Overlay Widget ───────────────────────────────────────────

class _ScanningOverlay extends StatefulWidget {
  const _ScanningOverlay();

  @override
  State<_ScanningOverlay> createState() => _ScanningOverlayState();
}

class _ScanningOverlayState extends State<_ScanningOverlay>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Stack(
          children: [
            Positioned.fill(
              child: Container(
                color: Colors.black.withValues(alpha: 0.35),
              ),
            ),
            Positioned(
              top: _controller.value * 196,
              left: 0,
              right: 0,
              child: Container(
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.secondary,
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.secondary.withValues(alpha: 0.8),
                      blurRadius: 12,
                      spreadRadius: 3,
                    ),
                  ],
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

// ── Ingredient Form Row Widget ──────────────────────────────────────────────

class _IngredientRow extends StatefulWidget {
  final PantryIngredient item;
  final List<String> suggestions;
  final Function(PantryIngredient) onChanged;
  final VoidCallback onDelete;

  const _IngredientRow({
    required this.item,
    required this.suggestions,
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
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        // Name (Autocomplete)
        Expanded(
          flex: 4,
          child: Autocomplete<String>(
            optionsBuilder: (TextEditingValue textEditingValue) {
              if (textEditingValue.text.isEmpty) {
                return const Iterable<String>.empty();
              }
              return widget.suggestions.where((String option) {
                return option.toLowerCase().contains(textEditingValue.text.toLowerCase());
              });
            },
            optionsViewBuilder: (context, onSelected, options) {
              return Align(
                alignment: Alignment.topLeft,
                child: Material(
                  elevation: 6.0,
                  color: AppColors.surface,
                  shape: RoundedRectangleBorder(
                    side: const BorderSide(color: AppColors.border),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: SizedBox(
                    width: 180,
                    child: ListView.builder(
                      padding: EdgeInsets.zero,
                      shrinkWrap: true,
                      itemCount: options.length,
                      itemBuilder: (BuildContext context, int index) {
                        final String option = options.elementAt(index);
                        return ListTile(
                          title: Text(option, style: const TextStyle(fontSize: 13)),
                          dense: true,
                          visualDensity: VisualDensity.compact,
                          onTap: () {
                            onSelected(option);
                          },
                        );
                      },
                    ),
                  ),
                ),
              );
            },
            onSelected: (String selection) {
              _nameController.text = selection;
              widget.onChanged(widget.item.copyWith(name: selection));
            },
            fieldViewBuilder: (context, textEditingController, focusNode, onFieldSubmitted) {
              // Keep text sync in autocomplete controller
              if (textEditingController.text != widget.item.name) {
                textEditingController.text = widget.item.name;
              }
              return TextField(
                controller: textEditingController,
                focusNode: focusNode,
                style: const TextStyle(fontSize: 13, color: AppColors.textPrimary),
                decoration: InputDecoration(
                  hintText: 'Name',
                  contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
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
              );
            },
          ),
        ),
        const SizedBox(width: 8),

        // Qty
        Expanded(
          flex: 2,
          child: TextField(
            controller: _qtyController,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            style: const TextStyle(fontSize: 13, color: AppColors.textPrimary),
            decoration: InputDecoration(
              hintText: 'Qty',
              contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
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

        // Unit Dropdown
        Expanded(
          flex: 3,
          child: DropdownButtonFormField<String>(
            key: ValueKey('${widget.item.name}_${widget.item.unit}'),
            initialValue: widget.item.unit.isEmpty ? 'g' : widget.item.unit,
            style: const TextStyle(fontSize: 13, color: AppColors.textPrimary),
            decoration: InputDecoration(
              contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
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

        // Delete Row
        IconButton(
          onPressed: widget.onDelete,
          icon: const Icon(Icons.delete_outline_rounded, color: AppColors.error),
          padding: EdgeInsets.zero,
          constraints: const BoxConstraints(),
        ),
      ],
    );
  }
}
