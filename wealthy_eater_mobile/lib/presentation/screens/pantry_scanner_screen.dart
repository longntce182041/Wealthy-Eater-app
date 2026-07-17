import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:wealthy_eater_mobile/core/theme/app_colors.dart';

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
  const PantryScannerScreen({Key? key}) : super(key: key);

  @override
  State<PantryScannerScreen> createState() => _PantryScannerScreenState();
}

class _PantryScannerScreenState extends State<PantryScannerScreen> with SingleTickerProviderStateMixin {
  ScannerState _state = ScannerState.upload;
  File? _imageFile;
  List<String> _inventory = [];
  List<String> _syncedInventory = [];
  final TextEditingController _addItemController = TextEditingController();
  bool _isSyncing = false;
  DateTime? _lastSynced;

  final ImagePicker _picker = ImagePicker();
  
  late AnimationController _laserController;
  int _msgIndex = 0;
  Timer? _scanTimer;
  Timer? _msgTimer;

  final List<String> _scanMessages = [
    'Uploading image to the cloud...',
    'Gemini Vision is filtering noise (bottles, containers)...',
    'Identifying raw food ingredients...',
    'Parsing ingredients...',
    'Finalizing ingredient list...',
  ];

  @override
  void initState() {
    super.initState();
    _laserController = AnimationController(vsync: this, duration: const Duration(seconds: 2));
  }

  @override
  void dispose() {
    _laserController.dispose();
    _addItemController.dispose();
    _scanTimer?.cancel();
    _msgTimer?.cancel();
    super.dispose();
  }

  Future<void> _pickImage(ImageSource source) async {
    final XFile? image = await _picker.pickImage(source: source);
    if (image != null) {
      setState(() {
        _imageFile = File(image.path);
        _state = ScannerState.scanning;
      });
      _startScanningSim();
    }
  }

  void _startScanningSim() {
    _laserController.repeat(reverse: true);
    _msgIndex = 0;
    _msgTimer = Timer.periodic(const Duration(milliseconds: 1800), (timer) {
      if (mounted) {
        setState(() {
          _msgIndex = (_msgIndex + 1) % _scanMessages.length;
        });
      }
    });

    _scanTimer = Timer(const Duration(milliseconds: 6500), () {
      _laserController.stop();
      _msgTimer?.cancel();
      if (mounted) {
        setState(() {
          _inventory = ['apple', 'broccoli', 'eggs', 'milk', 'chicken breast', 'cheddar cheese', 'carrot'];
          _state = ScannerState.review;
        });
      }
    });
  }

  void _handleAdd() {
    final v = _addItemController.text.trim().toLowerCase();
    if (v.isNotEmpty && !_inventory.contains(v)) {
      setState(() { _inventory.add(v); });
      _addItemController.clear();
    }
  }

  Future<void> _handleSync() async {
    setState(() { _isSyncing = true; });
    await Future.delayed(const Duration(milliseconds: 1800));
    if (mounted) {
      setState(() {
        _syncedInventory = List.from(_inventory);
        _lastSynced = DateTime.now();
        _isSyncing = false;
        _state = ScannerState.dashboard;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Virtual Fridge Scanner', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
            Text('UC-41 · Gemini Vision', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
          ],
        ),
        elevation: 1,
        shadowColor: AppColors.border,
        actions: [
          if (_state != ScannerState.upload)
            Padding(
              padding: const EdgeInsets.all(12),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(color: AppColors.primaryLight, borderRadius: BorderRadius.circular(20)),
                alignment: Alignment.center,
                child: Row(
                  children: [
                    Container(width: 6, height: 6, decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle)),
                    const SizedBox(width: 6),
                    Text(
                      _state == ScannerState.scanning ? 'Scanning...' : _state == ScannerState.review ? 'Review Mode' : 'Synced',
                      style: const TextStyle(fontSize: 12, color: AppColors.primaryDark, fontWeight: FontWeight.bold)
                    ),
                  ],
                ),
              ),
            )
        ],
      ),
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
    switch (_state) {
      case ScannerState.upload: return _buildUploadState();
      case ScannerState.scanning: return _buildScanningState();
      case ScannerState.review: return _buildReviewState(isDesktop);
      case ScannerState.dashboard: return _buildDashboardState();
    }
  }

  Widget _buildUploadState() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
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

  Widget _buildScanningState() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AspectRatio(
          aspectRatio: 4/3,
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              color: Colors.black87,
            ),
            clipBehavior: Clip.antiAlias,
            child: LayoutBuilder(
              builder: (context, boxConstraints) {
                return Stack(
                  fit: StackFit.expand,
                  children: [
                    if (_imageFile != null)
                      Opacity(opacity: 0.5, child: Image.file(_imageFile!, fit: BoxFit.cover)),
                    // Laser animation
                    AnimatedBuilder(
                      animation: _laserController,
                      builder: (context, child) {
                        return Positioned(
                          top: _laserController.value * (boxConstraints.maxHeight - 4),
                          left: 0, right: 0,
                          child: Container(
                            height: 3,
                            decoration: BoxDecoration(
                              color: AppColors.primary,
                              boxShadow: [
                                BoxShadow(color: AppColors.primary.withOpacity(0.8), blurRadius: 10, spreadRadius: 3),
                              ]
                            ),
                          ),
                        );
                      }
                    ),
                    // Corner brackets
                    Positioned(top: 16, left: 16, child: _buildBracket(true, true)),
                    Positioned(top: 16, right: 16, child: _buildBracket(true, false)),
                    Positioned(bottom: 16, left: 16, child: _buildBracket(false, true)),
                    Positioned(bottom: 16, right: 16, child: _buildBracket(false, false)),
                  ],
                );
              }
            ),
          ),
        ),
        const SizedBox(height: 24),
        Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(
            children: [
              const CircularProgressIndicator(color: AppColors.primary),
              const SizedBox(height: 16),
              const Text('AI Vision Active', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: AppColors.textPrimary)),
              const SizedBox(height: 8),
              Text(_scanMessages[_msgIndex], style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w600, fontSize: 15), textAlign: TextAlign.center),
              const SizedBox(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(_scanMessages.length, (i) => 
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 300),
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    width: i <= _msgIndex ? 24 : 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: i <= _msgIndex ? AppColors.primary : AppColors.divider,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  )
                ),
              ),
            ],
          ),
        )
      ],
    );
  }

  Widget _buildBracket(bool top, bool left) {
    return Container(
      width: 24, height: 24,
      decoration: BoxDecoration(
        border: Border(
          top: top ? const BorderSide(color: AppColors.primary, width: 3) : BorderSide.none,
          bottom: !top ? const BorderSide(color: AppColors.primary, width: 3) : BorderSide.none,
          left: left ? const BorderSide(color: AppColors.primary, width: 3) : BorderSide.none,
          right: !left ? const BorderSide(color: AppColors.primary, width: 3) : BorderSide.none,
        ),
      ),
    );
  }

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
                      color: Colors.white.withOpacity(0.8),
                      border: Border.all(color: Colors.white),
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 4, offset: const Offset(0, 2))],
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
