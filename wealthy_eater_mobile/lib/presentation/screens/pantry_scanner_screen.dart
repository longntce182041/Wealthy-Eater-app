import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:wealthy_eater_mobile/core/theme/app_colors.dart';
import '../providers/pantry_provider.dart';
import 'pantry_suggestions_screen.dart';

// --- Emoji Map ---
const Map<String, String> foodEmojiMap = {
  'apple': '🍎', 'apples': '🍎', 'pear': '🍐', 'orange': '🍊', 'lemon': '🍋',
  'banana': '🍌', 'grape': '🍇', 'grapes': '🍇', 'strawberry': '🍓', 'blueberry': '🫐',
  'cherry': '🍒', 'mango': '🥭', 'pineapple': '🍍', 'watermelon': '🍉', 'melon': '🍈',
  'peach': '🍑', 'kiwi': '🥝', 'coconut': '🥥', 'avocado': '🥑',
  'tomato': '🍅', 'carrot': '🥕', 'broccoli': '🥦', 'cucumber': '🥒',
  'lettuce': '🥬', 'spinach': '🥬', 'cabbage': '🥬', 'pepper': '🫑',
  'bell pepper': '🫑', 'corn': '🌽', 'potato': '🥔', 'sweet potato': '🍠',
  'garlic': '🧄', 'onion': '🧅', 'mushroom': '🍄', 'eggplant': '🍆',
  'egg': '🥚', 'eggs': '🥚', 'milk': '🥛', 'butter': '🧈', 'cheese': '🧀',
  'cheddar cheese': '🧀', 'yogurt': '🍶', 'cream': '🍶',
  'chicken': '🍗', 'chicken breast': '🍗', 'beef': '🥩', 'pork': '🥩',
  'steak': '🥩', 'meat': '🥩', 'fish': '🐟', 'salmon': '🐟', 'shrimp': '🍤',
  'tuna': '🐟', 'sausage': '🌭', 'bacon': '🥓', 'ham': '🍖',
  'bread': '🍞', 'rice': '🍚', 'pasta': '🍝', 'noodle': '🍜', 'noodles': '🍜',
  'tofu': '🧇', 'tempeh': '🧆', 'bean': '🫘', 'beans': '🫘',
  'juice': '🧃', 'orange juice': '🧃', 'water': '💧', 'soda': '🥤',
  'beer': '🍺', 'wine': '🍷', 'sauce': '🫙', 'ketchup': '🫙',
  'oil': '🫙', 'vinegar': '🫙', 'jam': '🫙', 'honey': '🍯',
  'chocolate': '🍫', 'cake': '🎂', 'pie': '🥧',
  'lime': '🍋', 'ginger': '🫚', 'herb': '🌿', 'herbs': '🌿',
};

String getEmoji(String name) {
  final lower = name.toLowerCase().trim();
  if (foodEmojiMap.containsKey(lower)) return foodEmojiMap[lower]!;
  for (var entry in foodEmojiMap.entries) {
    if (lower.contains(entry.key)) return entry.value;
  }
  return '🥗';
}

// --- Categories ---
class FoodCategory {
  final String id;
  final String label;
  final String emoji;
  final Color bgColor;
  final Color borderColor;
  final Color textColor;
  final List<String> keywords;

  FoodCategory({
    required this.id, required this.label, required this.emoji,
    required this.bgColor, required this.borderColor, required this.textColor,
    required this.keywords,
  });
}

final categories = [
  FoodCategory(
    id: 'produce', label: 'Fresh Produce', emoji: '🥦',
    bgColor: const Color(0xFFECFDF5), borderColor: const Color(0xFFA7F3D0), textColor: const Color(0xFF047857),
    keywords: ['apple','pear','orange','lemon','lime','banana','grape','strawberry','blueberry','cherry','mango','pineapple','watermelon','peach','kiwi','avocado','tomato','carrot','broccoli','cucumber','lettuce','spinach','cabbage','pepper','bell pepper','corn','potato','sweet potato','garlic','onion','mushroom','eggplant','herb','herbs','ginger','vegetable','fruit'],
  ),
  FoodCategory(
    id: 'dairy', label: 'Dairy & Eggs', emoji: '🥛',
    bgColor: const Color(0xFFFFFBEB), borderColor: const Color(0xFFFDE68A), textColor: const Color(0xFFB45309),
    keywords: ['egg','eggs','milk','butter','cheese','yogurt','cream','cheddar','dairy'],
  ),
  FoodCategory(
    id: 'protein', label: 'Proteins & Meat', emoji: '🍗',
    bgColor: const Color(0xFFFFF1F2), borderColor: const Color(0xFFFECDD3), textColor: const Color(0xFFBE123C),
    keywords: ['chicken','beef','pork','steak','meat','fish','salmon','shrimp','tuna','sausage','bacon','ham','seafood','tofu','tempeh','bean','beans','protein'],
  ),
  FoodCategory(
    id: 'others', label: 'Condiments & Others', emoji: '🫙',
    bgColor: const Color(0xFFF8FAFC), borderColor: const Color(0xFFE2E8F0), textColor: const Color(0xFF475569),
    keywords: [],
  ),
];

String categorizeItem(String name) {
  final lower = name.toLowerCase();
  for (var i = 0; i < categories.length - 1; i++) {
    if (categories[i].keywords.any((kw) => lower.contains(kw))) return categories[i].id;
  }
  return 'others';
}

// --- Main Widget ---
enum ScannerState { upload, scanning, review, dashboard }

class PantryScannerScreen extends StatefulWidget {
  const PantryScannerScreen({super.key});

  @override
  State<PantryScannerScreen> createState() => _PantryScannerScreenState();
}

class _PantryScannerScreenState extends State<PantryScannerScreen> {
  ScannerState _state = ScannerState.upload;
  File? _imageFile;
  List<String> _inventory = [];
  List<String> _syncedInventory = [];
  final TextEditingController _addItemController = TextEditingController();
  bool _isSyncing = false;
  DateTime? _lastSynced;

  @override
  void dispose() {
    _addItemController.dispose();
    super.dispose();
  }

  /// Picks an image from [source] and calls the real backend scan via PantryProvider.
  Future<void> _pickImage(ImageSource source) async {
    final provider = context.read<PantryProvider>();
    await provider.pickAndScanPantry(source);
    if (!mounted) return;

    if (provider.error != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Scan failed: ${provider.error}'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    // Map provider tempIngredients (PantryIngredient objects) to plain strings for UI
    setState(() {
      _imageFile = provider.scannedImagePath != null ? File(provider.scannedImagePath!) : null;
      _inventory = provider.tempIngredients
          .map((i) => i.name.toLowerCase().trim())
          .where((n) => n.isNotEmpty)
          .toList();
      _state = ScannerState.review;
    });
  }

  void _handleAdd() {
    final v = _addItemController.text.trim().toLowerCase();
    if (v.isNotEmpty && !_inventory.contains(v)) {
      setState(() { _inventory.add(v); });
      _addItemController.clear();
    }
  }

  /// Saves the current inventory list to the backend (Virtual Fridge / Pantry DB).
  Future<void> _handleSync() async {
    setState(() { _isSyncing = true; });
    final provider = context.read<PantryProvider>();

    // Push current _inventory strings into provider as PantryIngredient objects
    provider.setTempIngredientsFromNames(_inventory);
    await provider.savePantry();

    if (!mounted) return;

    if (provider.error != null) {
      setState(() { _isSyncing = false; });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Sync failed: ${provider.error}'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    setState(() {
      _syncedInventory = List.from(_inventory);
      _lastSynced = DateTime.now();
      _isSyncing = false;
      _state = ScannerState.dashboard;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: LayoutBuilder(
        builder: (context, constraints) {
          final isDesktop = constraints.maxWidth > 600;
          return SingleChildScrollView(
            padding: EdgeInsets.all(isDesktop ? 32 : 16),
            child: _buildCurrentState(isDesktop),
          );
        },
      ),
    );
  }

  Widget _buildCurrentState(bool isDesktop) {
    final provider = context.watch<PantryProvider>();
    // Scanning state: show loading indicator while provider processes image
    if (provider.isLoading) return _buildLoadingState();
    switch (_state) {
      case ScannerState.upload: return _buildUploadState();
      case ScannerState.scanning: return _buildUploadState(); // fallback
      case ScannerState.review: return _buildReviewState(isDesktop);
      case ScannerState.dashboard: return _buildDashboardState();
    }
  }

  Widget _buildLoadingState() {
    return const Center(
      child: Padding(
        padding: EdgeInsets.all(40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(color: AppColors.primary),
            SizedBox(height: 20),
            Text(
              'AI Vision is scanning your fridge...',
              style: TextStyle(color: AppColors.textSecondary, fontSize: 15),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAiSuggestionsCard() {
    return Container(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF2E4E41), Color(0xFF4A9F71)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.25),
            blurRadius: 10,
            offset: const Offset(0, 4),
          )
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
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.auto_awesome, color: Colors.white, size: 20),
              ),
              const SizedBox(width: 12),
              const Text(
                'AI Recipe Suggestions',
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          const Text(
            'Get tailored recipe ideas created instantly from your virtual fridge items while respecting your dietary profile.',
            style: TextStyle(fontSize: 13, color: Colors.white70, height: 1.4),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () {
                context.read<PantryProvider>().suggestMeals();
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const PantrySuggestionsScreen(),
                  ),
                );
              },
              icon: const Icon(Icons.restaurant_menu, size: 18),
              label: const Text('Suggest Meals Now', style: TextStyle(fontWeight: FontWeight.bold)),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.secondary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                elevation: 0,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildUploadState() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _buildAiSuggestionsCard(),
        const SizedBox(height: 20),
        Container(
          padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: AppColors.border, width: 2),
          ),
          child: Column(
            children: [
              Container(
                width: 80, height: 80,
                decoration: const BoxDecoration(
                  color: AppColors.primaryLight,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.cloud_upload_outlined, size: 40, color: AppColors.primary),
              ),
              const SizedBox(height: 24),
              const Text('Upload Fridge Photo', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
              const SizedBox(height: 8),
              const Text('Tap below to take a photo or choose from gallery. Gemini Vision will automatically detect all food items.', textAlign: TextAlign.center, style: TextStyle(color: AppColors.textSecondary)),
              const SizedBox(height: 32),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  ElevatedButton.icon(
                    onPressed: () => _pickImage(ImageSource.camera),
                    icon: const Icon(Icons.camera_alt),
                    label: const Text('Take Photo'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary, 
                      foregroundColor: Colors.white, 
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                  const SizedBox(width: 16),
                  OutlinedButton.icon(
                    onPressed: () => _pickImage(ImageSource.gallery),
                    icon: const Icon(Icons.photo_library),
                    label: const Text('Browse'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.primary, 
                      side: const BorderSide(color: AppColors.primary), 
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.orange.shade50,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.orange.shade200),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('💡', style: TextStyle(fontSize: 20)),
              const SizedBox(width: 12),
              Expanded(
                child: RichText(
                  text: const TextSpan(
                    style: TextStyle(color: Colors.brown, fontSize: 14),
                    children: [
                      TextSpan(text: 'Tip: ', style: TextStyle(fontWeight: FontWeight.bold)),
                      TextSpan(text: 'Open your fridge wide and ensure good lighting for the best AI detection results.'),
                    ]
                  )
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // _buildScanningState removed — scanning is now handled synchronously by
  // pickAndScanPantry() in the provider. The screen transitions from upload
  // directly to review when the provider completes. The loading state is shown
  // via provider.isLoading on the upload button.

  Widget _buildReviewState(bool isDesktop) {
    final imageSection = _imageFile != null ? [
      Container(
        height: isDesktop ? 300 : 180,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          image: DecorationImage(image: FileImage(_imageFile!), fit: BoxFit.cover),
          border: Border.all(color: AppColors.border),
        ),
      ),
      const SizedBox(height: 16),
    ] : <Widget>[];

    final reviewSection = [
      Expanded(
        flex: isDesktop ? 1 : 0,
        child: Container(
          constraints: isDesktop ? null : const BoxConstraints(minHeight: 350),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Detected Ingredients', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.textPrimary)),
                        SizedBox(height: 4),
                        Text('Remove false positives or add missed items', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(color: AppColors.primaryLight, borderRadius: BorderRadius.circular(16)),
                      child: Text('${_inventory.length} items', style: const TextStyle(color: AppColors.primaryDark, fontWeight: FontWeight.bold, fontSize: 12)),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1, color: AppColors.divider),
              Expanded(
                flex: isDesktop ? 1 : 0,
                child: isDesktop ? _buildListContent() : SizedBox(height: 250, child: _buildListContent()),
              ),
              const Divider(height: 1, color: AppColors.divider),
              Padding(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _addItemController,
                        decoration: InputDecoration(
                          hintText: 'Add missed ingredient...',
                          prefixIcon: const Icon(Icons.add, size: 20),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.border)),
                          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.border)),
                          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.primary)),
                        ),
                        onSubmitted: (v) => _handleAdd(),
                      ),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton(
                      onPressed: _handleAdd,
                      style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)), padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14)),
                      child: const Text('Add'),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
      const SizedBox(height: 24),
      Row(
        children: [
          Expanded(
            flex: 1,
            child: OutlinedButton.icon(
              onPressed: () { setState(() { _state = ScannerState.upload; _imageFile = null; _inventory.clear(); }); },
              icon: const Icon(Icons.refresh),
              label: const Text('Rescan'),
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16), 
                foregroundColor: AppColors.textSecondary,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            flex: 2,
            child: ElevatedButton.icon(
              onPressed: _inventory.isEmpty || _isSyncing ? null : _handleSync,
              icon: _isSyncing 
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) 
                : const Icon(Icons.cloud_sync),
              label: Text(_isSyncing ? 'Syncing...' : 'Sync to Virtual Fridge', style: const TextStyle(fontWeight: FontWeight.bold)),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary, 
                foregroundColor: Colors.white, 
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
        ],
      )
    ];

    if (isDesktop) {
      return Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (_imageFile != null) Expanded(flex: 2, child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: imageSection)),
          if (_imageFile != null) const SizedBox(width: 24),
          Expanded(flex: 3, child: SizedBox(height: 600, child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: reviewSection))),
        ],
      );
    }

    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [...imageSection, ...reviewSection]);
  }

  Widget _buildListContent() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (_inventory.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 40),
            child: Center(child: Text('No items detected. Add manually below.', style: TextStyle(color: AppColors.textTertiary))),
          )
        else
          Wrap(
            spacing: 8, runSpacing: 8,
            children: _inventory.map((item) => Chip(
              backgroundColor: Colors.white,
              side: const BorderSide(color: AppColors.border),
              label: Text('${getEmoji(item)}  ${item[0].toUpperCase()}${item.substring(1)}', style: const TextStyle(color: AppColors.textPrimary)),
              onDeleted: () {
                setState(() { _inventory.remove(item); });
              },
              deleteIcon: const Icon(Icons.close, size: 16, color: AppColors.textTertiary),
              deleteButtonTooltipMessage: 'Remove $item',
            )).toList(),
          ),
      ],
    );
  }

  Widget _buildDashboardState() {
    Map<String, List<String>> grouped = {};
    for (var cat in categories) { grouped[cat.id] = []; }
    for (var item in _syncedInventory) {
      grouped[categorizeItem(item)]!.add(item);
    }

    String timeString = _lastSynced != null ? "${_lastSynced!.hour.toString().padLeft(2, '0')}:${_lastSynced!.minute.toString().padLeft(2, '0')}" : "Just now";

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _buildAiSuggestionsCard(),
        const SizedBox(height: 20),
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [AppColors.primary, Color(0xFF34D399)]),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(12)),
                    child: const Icon(Icons.check_circle, color: Colors.white),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Virtual Fridge Updated!', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            const Icon(Icons.access_time, color: Colors.white70, size: 14),
                            const SizedBox(width: 4),
                            Text('Last synced: $timeString via AI Vision', style: const TextStyle(color: Colors.white70, fontSize: 13)),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(8)),
                    child: Text('${_syncedInventory.length} items synced', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                  ),
                  ElevatedButton.icon(
                    onPressed: () { setState(() { _state = ScannerState.upload; _imageFile = null; _inventory.clear(); }); },
                    icon: const Icon(Icons.camera_alt, size: 16),
                    label: const Text('Scan New'),
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.white, foregroundColor: AppColors.primary, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                  )
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                const Icon(Icons.kitchen, color: AppColors.primary, size: 20),
                const SizedBox(width: 8),
                const Text('Your Virtual Fridge', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.textPrimary)),
              ],
            ),
            TextButton.icon(
              onPressed: () { setState(() { _state = ScannerState.review; }); },
              icon: const Icon(Icons.edit, size: 14),
              label: const Text('Edit Inventory', style: TextStyle(fontSize: 12)),
              style: TextButton.styleFrom(foregroundColor: AppColors.textSecondary),
            ),
          ],
        ),
        const SizedBox(height: 16),
        ...categories.map((cat) {
          final items = grouped[cat.id]!;
          if (items.isEmpty) return const SizedBox.shrink();
          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: cat.bgColor,
              border: Border.all(color: cat.borderColor),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(cat.emoji, style: const TextStyle(fontSize: 20)),
                    const SizedBox(width: 8),
                    Text(cat.label, style: TextStyle(fontWeight: FontWeight.bold, color: cat.textColor, fontSize: 15)),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(color: Colors.white54, borderRadius: BorderRadius.circular(10)),
                      child: Text('${items.length}', style: TextStyle(fontWeight: FontWeight.bold, color: cat.textColor, fontSize: 12)),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8, runSpacing: 8,
                  children: items.map((item) => Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.8),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.border),
                      boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 4, offset: const Offset(0, 2))],
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(getEmoji(item), style: const TextStyle(fontSize: 14)),
                        const SizedBox(width: 4),
                        Text('${item[0].toUpperCase()}${item.substring(1)}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: AppColors.textSecondary)),
                      ],
                    ),
                  )).toList(),
                ),
              ],
            ),
          );
        }),
        const SizedBox(height: 24),
        InkWell(
          onTap: () { setState(() { _state = ScannerState.upload; _imageFile = null; _inventory.clear(); }); },
          borderRadius: BorderRadius.circular(16),
          child: Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              border: Border.all(color: AppColors.primaryLight, width: 2),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(color: AppColors.primaryLight, borderRadius: BorderRadius.circular(12)),
                  child: const Icon(Icons.camera_alt, color: AppColors.primary),
                ),
                const SizedBox(width: 16),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Scan a New Fridge Photo', style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                      Text('Update your pantry inventory at any time', style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
