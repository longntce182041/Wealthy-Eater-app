import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  // Base Colors (Giữ nguyên vì quá đẹp)
  static const Color background = Color(0xFFF7FAF5); 
  static const Color surface = Color(0xFFFFFCF7); 
  
  // Brand Colors
  static const Color primary = Color(0xFF4A9F71); 
  static const Color primaryDark = Color(0xFF2E4E41); 
  static const Color primaryLight = Color(0xFFD4EFE0); 
  static const Color secondary = Color(0xFFE27A13);
  
  // Text Colors (Nhuộm sắc xanh vào xám - Bí quyết của High-end UI)
  static const Color textPrimary = Color(0xFF141F1A); 
  static const Color textSecondary = Color(0xFF5A6B62); 
  static const Color textTertiary = Color(0xFF90A499); 
  static const Color textOnPrimary = Colors.white; 

  // Semantic Colors (Tách biệt rõ ràng với màu Brand)
  static const Color error = Color(0xFFD32F2F);
  static const Color success = Color(0xFF2E7D32); 
  static const Color warning = Color(0xFFEF6C00);

  // Borders & Dividers (Sử dụng xám ấm ngả xanh để tiệp với Background)
  static const Color border = Color(0xFFE2EBE5); 
  static const Color divider = Color(0xFFEDF2EE); 
}