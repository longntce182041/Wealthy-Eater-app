/// meal_image_scan_screen.dart — Premium AI Meal Scanner Screen.

import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_colors.dart';
import '../../data/models/meal_image_scan_model.dart';
import '../providers/meal_image_scan_provider.dart';

class MealImageScanScreen extends StatefulWidget {
  const MealImageScanScreen({super.key});

  @override
  State<MealImageScanScreen> createState() => _MealImageScanScreenState();
}

class _MealImageScanScreenState extends State<MealImageScanScreen> {
  MealImageScanProvider? _scanProvider;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _scanProvider = Provider.of<MealImageScanProvider>(context, listen: false);
  }

  @override
  void dispose() {
    final provider = _scanProvider;
    if (provider != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        provider.clear();
      });
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<MealImageScanProvider>();
    final cameraSupported = provider.supportsCameraSource;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        title: const Text(
          'AI Meal Scanner',
          style: TextStyle(
            color: AppColors.textPrimary,
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: AppColors.textPrimary, size: 20),
          onPressed: () => Navigator.of(context).pop(),
        ),
        actions: [
          if (provider.hasResult || provider.imagePath != null)
            IconButton(
              icon: const Icon(Icons.refresh_rounded, color: AppColors.primary),
              onPressed: provider.clear,
              tooltip: 'Reset',
            ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Take a photo or upload an image of your meal plate. The AI will recognize the dish, estimate portion weight, and analyze nutrition.',
                style: TextStyle(
                  fontSize: 14,
                  color: AppColors.textSecondary,
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 24),

              // ── Image Upload & Preview Section ──
              _buildImagePreviewOrPicker(context, provider, cameraSupported),
              const SizedBox(height: 24),

              // ── Processing Status / Loading ──
              if (provider.isLoading) ...[
                const SizedBox(height: 12),
                const Center(
                  child: Column(
                    children: [
                      CircularProgressIndicator(
                        color: AppColors.primary,
                        strokeWidth: 3.5,
                      ),
                      SizedBox(height: 16),
                      Text(
                        'Analyzing meal plate with AI...',
                        style: TextStyle(
                          color: AppColors.primaryDark,
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                        ),
                      ),
                      SizedBox(height: 6),
                      Text(
                        'This process may take a few seconds',
                        style: TextStyle(
                          color: AppColors.textTertiary,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              // ── Error State ──
              if (provider.error != null) ...[
                const SizedBox(height: 12),
                _buildErrorCard(context, provider, provider.error!),
              ],

              // ── Result Summary ──
              if (provider.result != null && !provider.isLoading) ...[
                const SizedBox(height: 8),
                _ResultDashboard(result: provider.result!),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildImagePreviewOrPicker(
    BuildContext context,
    MealImageScanProvider provider,
    bool cameraSupported,
  ) {
    if (provider.imagePath != null) {
      return Center(
        child: Stack(
          children: [
            Container(
              height: 260,
              width: double.infinity,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(24),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x18000000),
                    blurRadius: 15,
                    offset: Offset(0, 8),
                  ),
                ],
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(24),
                child: kIsWeb
                    ? Image.network(
                        provider.imagePath!,
                        fit: BoxFit.cover,
                        width: double.infinity,
                      )
                    : Image.file(
                        File(provider.imagePath!),
                        fit: BoxFit.cover,
                        width: double.infinity,
                      ),
              ),
            ),
            if (provider.isLoading)
              const Positioned.fill(
                child: ClipRRect(
                  borderRadius: BorderRadius.all(Radius.circular(24)),
                  child: _ScanningOverlay(),
                ),
              ),
          ],
        ),
      );
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 24),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.border, width: 1.5),
        boxShadow: const [
          BoxShadow(
            color: Color(0x06000000),
            blurRadius: 10,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.primaryLight,
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.camera_alt_rounded,
              color: AppColors.primary,
              size: 36,
            ),
          ),
          const SizedBox(height: 20),
          const Text(
            'No image selected',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Capture directly or upload a photo from your gallery',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 13,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 28),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => provider.pickAndScan(ImageSource.gallery),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    side: const BorderSide(color: AppColors.primary),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  icon: const Icon(Icons.photo_library_outlined, color: AppColors.primary, size: 20),
                  label: const Text(
                    'Gallery',
                    style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
              if (cameraSupported) ...[
                const SizedBox(width: 16),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => provider.pickAndScan(ImageSource.camera),
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      backgroundColor: AppColors.primary,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    icon: const Icon(Icons.camera_alt_outlined, color: Colors.white, size: 20),
                    label: const Text(
                      'Camera',
                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildErrorCard(BuildContext context, MealImageScanProvider provider, String message) {
    final bool isNonFoodError = message.toLowerCase().contains('no valid meal') || 
                                message.toLowerCase().contains('photo') || 
                                message.toLowerCase().contains('food') ||
                                message.toLowerCase().contains('detected');

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF3E0),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFFFB74D), width: 1.2),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0A000000),
            blurRadius: 10,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: const BoxDecoration(
                  color: Color(0xFFFFE0B2),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.no_meals_outlined,
                  color: Color(0xFFE65100),
                  size: 24,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  isNonFoodError ? 'No Meal Detected' : 'Analysis Failed',
                  style: const TextStyle(
                    color: Color(0xFFE65100),
                    fontWeight: FontWeight.w900,
                    fontSize: 16,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            message.isNotEmpty
                ? message
                : 'No valid meal detected in image. Please take a clear photo of your meal plate and try again.',
            style: const TextStyle(
              color: Color(0xFF5D4037),
              fontSize: 13,
              height: 1.4,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => provider.pickAndScan(ImageSource.gallery),
                  icon: const Icon(Icons.photo_library_outlined, color: AppColors.primary, size: 18),
                  label: const Text(
                    'Choose Photo',
                    style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 13),
                  ),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    side: const BorderSide(color: AppColors.primary),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () => provider.pickAndScan(ImageSource.camera),
                  icon: const Icon(Icons.camera_alt_rounded, color: Colors.white, size: 18),
                  label: const Text(
                    'Retake Photo',
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ── Animated Scanner Overlay Widget ──
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
              top: _controller.value * 256,
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

// ── Result Dashboard Widget ──
class _ResultDashboard extends StatelessWidget {
  final MealImageScanResult result;

  const _ResultDashboard({required this.result});

  void _showLogMealDialog(BuildContext context) {
    final provider = context.read<MealImageScanProvider>();
    double loggedWeight = result.ingredients.fold(0.0, (sum, item) => sum + (item.estimatedAmount ?? 0.0));
    if (loggedWeight == 0.0) loggedWeight = 150.0; // default portion weight

    final ctrl = TextEditingController(text: loggedWeight.toStringAsFixed(0));

    showDialog(
      context: context,
      builder: (dialogCtx) {
        return AlertDialog(
          title: const Text('Log Scanned Meal'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Enter the portion weight you consumed (g):'),
              const SizedBox(height: 12),
              TextField(
                controller: ctrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  suffixText: 'g',
                  border: OutlineInputBorder(),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogCtx),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () async {
                final weight = double.tryParse(ctrl.text) ?? loggedWeight;
                Navigator.pop(dialogCtx);
                
                final success = await provider.logScannedMeal(weight);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(success ? 'Meal successfully added to daily logs!' : 'Failed to log meal.'),
                      backgroundColor: success ? AppColors.success : AppColors.error,
                    ),
                  );
                }
              },
              child: const Text('Save Log'),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final double confidencePct = (result.confidence * 100);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // ── 2D Visual Reference Warning Card ──
        Container(
          width: double.infinity,
          margin: const EdgeInsets.only(bottom: 16),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFFFFF8E1), // Light amber background
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFFFE082), width: 1.2),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(
                Icons.warning_amber_rounded,
                color: Color(0xFFF57F17),
                size: 22,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Text(
                      'Reference Warning (2D Image)',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFFE65100),
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'AI camera analysis estimates portion sizes based strictly on 2D visual representations. Actual weight (g) may vary depending on thickness and density. Please verify and adjust actual gram weights manually when logging.',
                      style: TextStyle(
                        fontSize: 12,
                        color: Color(0xFF4E342E),
                        height: 1.35,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),

        // ── Main Card: Meal name & Strict Confidence ──
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            boxShadow: const [
              BoxShadow(
                color: Color(0x06000000),
                blurRadius: 12,
                offset: Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      result.mealName,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: confidencePct >= 75
                          ? AppColors.primaryLight
                          : const Color(0xFFFFF3E0),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: confidencePct >= 75
                            ? AppColors.primary.withValues(alpha: 0.3)
                            : const Color(0xFFFFB74D),
                        width: 1,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          confidencePct >= 75
                              ? Icons.verified_outlined
                              : Icons.visibility_outlined,
                          size: 13,
                          color: confidencePct >= 75
                              ? AppColors.primaryDark
                              : const Color(0xFFE65100),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          '2D Estimate: ${confidencePct.toStringAsFixed(0)}%',
                          style: TextStyle(
                            color: confidencePct >= 75
                                ? AppColors.primaryDark
                                : const Color(0xFFE65100),
                            fontWeight: FontWeight.bold,
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              
              // ── Macro nutritional breakdown Grid ──
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 2.1,
                children: [
                  _buildMacroTile(
                    'Calories',
                    result.totals.kcal.toStringAsFixed(0),
                    'kcal',
                    const Color(0xFFFFF3E0),
                    AppColors.warning,
                  ),
                  _buildMacroTile(
                    'Protein',
                    result.totals.protein.toStringAsFixed(1),
                    'g',
                    const Color(0xFFE8F5E9),
                    AppColors.success,
                  ),
                  _buildMacroTile(
                    'Carbs',
                    result.totals.carbs.toStringAsFixed(1),
                    'g',
                    const Color(0xFFE3F2FD),
                    Colors.blue.shade700,
                  ),
                  _buildMacroTile(
                    'Fats',
                    result.totals.fats.toStringAsFixed(1),
                    'g',
                    const Color(0xFFFFFDE7),
                    Colors.amber.shade700,
                  ),
                ],
              ),

              // ── Log Meal Action (Only if matched in system) ──
              if (result.matchedInSystem && result.recipeId != null) ...[
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton.icon(
                    onPressed: () => _showLogMealDialog(context),
                    icon: const Icon(Icons.add_circle_outline_rounded, color: Colors.white),
                    label: const Text('Log This Meal', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 28),

        // ── Ingredients List Section ──
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Detected Ingredients',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w900,
                color: AppColors.textPrimary,
              ),
            ),
            Text(
              '${result.ingredients.length} items',
              style: const TextStyle(
                fontSize: 12,
                color: AppColors.textTertiary,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        ...result.ingredients.map((ing) => _buildIngredientTile(ing)),
        
        // ── AI Disclaimer Note ──
        if (result.note.isNotEmpty) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.amber.shade50,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.amber.shade200),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.info_outline_rounded, color: Colors.amber.shade900, size: 16),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    result.note,
                    style: TextStyle(
                      fontSize: 11,
                      color: Colors.amber.shade900,
                      fontWeight: FontWeight.w500,
                      height: 1.35,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildMacroTile(
    String label,
    String value,
    String unit,
    Color bgColor,
    Color accentColor,
  ) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 2),
          RichText(
            text: TextSpan(
              children: [
                TextSpan(
                  text: value,
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                    color: accentColor,
                  ),
                ),
                TextSpan(
                  text: ' $unit',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: accentColor.withValues(alpha: 0.8),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildIngredientTile(MealImageScanIngredient ingredient) {
    final bool isMatched = ingredient.status.toLowerCase() == 'ok';

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isMatched ? AppColors.border : const Color(0xFFFFCDD2),
          width: 1.2,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: isMatched ? AppColors.primaryLight : const Color(0xFFFFEBEE),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  isMatched ? Icons.check_circle_outline_rounded : Icons.help_outline_rounded,
                  color: isMatched ? AppColors.primary : AppColors.error,
                  size: 16,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  ingredient.inputName,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
              if (ingredient.estimatedAmount != null)
                Text(
                  '${ingredient.estimatedAmount!.toStringAsFixed(0)}${ingredient.estimatedUnit ?? 'g'}',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                    color: AppColors.textSecondary,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 10),
          
          // Match detail subtitle
          Text(
            isMatched
                ? 'Successfully matched: ${ingredient.matchedName}'
                : 'Free-text suggested ingredient',
            style: TextStyle(
              fontSize: 12,
              color: isMatched ? AppColors.success : AppColors.warning,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 6),
          
          // Detailed macros per ingredient
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            decoration: BoxDecoration(
              color: AppColors.background.withValues(alpha: 0.5),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _buildIngredientMacroText('Kcal', ingredient.nutrition.kcal.toStringAsFixed(0)),
                _buildIngredientMacroText('Protein', '${ingredient.nutrition.protein.toStringAsFixed(1)}g'),
                _buildIngredientMacroText('Carbs', '${ingredient.nutrition.carbs.toStringAsFixed(1)}g'),
                _buildIngredientMacroText('Fats', '${ingredient.nutrition.fats.toStringAsFixed(1)}g'),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildIngredientMacroText(String macro, String val) {
    return RichText(
      text: TextSpan(
        style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
        children: [
          TextSpan(text: '$macro: ', style: const TextStyle(fontWeight: FontWeight.w500)),
          TextSpan(text: val, style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
        ],
      ),
    );
  }
}
