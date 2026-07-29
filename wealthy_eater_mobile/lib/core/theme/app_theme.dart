import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'app_colors.dart';
import 'app_text_styles.dart';

class AppTheme {
  static ThemeData build() {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: AppColors.primary,
      brightness: Brightness.light,
      surface: AppColors.surface,
    ).copyWith(
      primary: AppColors.primary,
      secondary: AppColors.secondary,
      tertiary: AppColors.primaryDark,
      surface: AppColors.surface,
      error: AppColors.error,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: AppColors.background,
      textTheme: GoogleFonts.poppinsTextTheme().copyWith(
        headlineLarge: AppTextStyles.headlineLarge,
        headlineMedium: AppTextStyles.headlineMedium,
        titleLarge: AppTextStyles.titleLarge,
        bodyLarge: AppTextStyles.bodyLarge,
        bodyMedium: AppTextStyles.bodyMedium,
        labelLarge: AppTextStyles.labelLarge,
      ),
      appBarTheme: AppBarTheme(
        centerTitle: false,
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        scrolledUnderElevation: 0, // Fix Material 3 scroll tinting
        surfaceTintColor: Colors.transparent, // Ensure no overlay tint applies
        titleTextStyle: AppTextStyles.titleLarge,
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: AppColors.background,
        indicatorColor: AppColors.primaryLight,
        labelTextStyle: WidgetStateProperty.all(AppTextStyles.caption.copyWith(fontWeight: FontWeight.w600)),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: AppColors.background,
        elevation: 0,
      ),
      cardTheme: CardThemeData(
        color: AppColors.surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
          side: const BorderSide(color: AppColors.border, width: 1),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: AppColors.textOnPrimary,
          textStyle: AppTextStyles.labelLarge,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          minimumSize: const Size(44, 48), // Touch target rule: min height 48px
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          elevation: 0,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.textPrimary,
          textStyle: AppTextStyles.labelLarge,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          minimumSize: const Size(44, 48), // Touch target rule: min height 48px
          side: const BorderSide(color: AppColors.border, width: 1.5),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppColors.primary,
          textStyle: AppTextStyles.labelLarge.copyWith(color: AppColors.primary),
          minimumSize: const Size(44, 44),
        ),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: AppColors.surface,
        selectedColor: AppColors.primaryLight,
        disabledColor: AppColors.background,
        labelStyle: AppTextStyles.bodyMedium.copyWith(color: AppColors.textPrimary),
        secondaryLabelStyle: AppTextStyles.bodyMedium.copyWith(color: AppColors.primary),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: AppColors.border),
        ),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: AppColors.surface,
        elevation: 4,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        titleTextStyle: AppTextStyles.titleLarge,
        contentTextStyle: AppTextStyles.bodyMedium,
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: AppColors.surface,
        modalBackgroundColor: AppColors.surface,
        elevation: 8,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
      ),
      dividerTheme: const DividerThemeData(
        color: AppColors.divider,
        thickness: 1,
        space: 1,
      ),
      tabBarTheme: TabBarThemeData(
        labelColor: AppColors.primary,
        unselectedLabelColor: AppColors.textSecondary,
        labelStyle: AppTextStyles.bodyMedium.copyWith(fontWeight: FontWeight.w600),
        unselectedLabelStyle: AppTextStyles.bodyMedium,
        indicatorColor: AppColors.primary,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surface,
        hintStyle: AppTextStyles.bodyMedium.copyWith(color: AppColors.textTertiary),
        contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: AppColors.border, width: 1),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: AppColors.primary, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: AppColors.error, width: 1),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: AppColors.error, width: 2),
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        backgroundColor: AppColors.textPrimary,
        contentTextStyle: AppTextStyles.bodyMedium.copyWith(color: AppColors.textOnPrimary),
      ),
    );
  }
}