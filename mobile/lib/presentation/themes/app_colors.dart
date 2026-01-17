import 'package:flutter/material.dart';

/// ThinkCraft 颜色系统
/// 完全对齐Web端CSS变量，支持亮色和暗黑模式
class AppColors {
  // ==================== 亮色模式（默认）====================
  static const primary = Color(0xFF6366F1); // --primary
  static const primaryDark = Color(0xFF4F46E5); // --primary-dark
  static const primaryLight = Color(0xFF818CF8); // --primary-light

  static const bgPrimary = Color(0xFFFFFFFF); // --bg-primary
  static const bgSecondary = Color(0xFFF9FAFB); // --bg-secondary
  static const bgTertiary = Color(0xFFF3F4F6); // --bg-tertiary
  static const bgSidebar = Color(0xFFF3F4F6); // --bg-sidebar

  static const textPrimary = Color(0xFF111827); // --text-primary
  static const textSecondary = Color(0xFF6B7280); // --text-secondary
  static const textTertiary = Color(0xFF9CA3AF); // --text-tertiary

  static const border = Color(0xFFE5E7EB); // --border
  static const borderLight = Color(0xFFF3F4F6); // --border-light

  static const shadow = Color(0x0D000000); // rgba(0, 0, 0, 0.05)

  // 状态颜色
  static const error = Color(0xFFEF4444); // --error
  static const success = Color(0xFF10B981); // --success
  static const warning = Color(0xFFF59E0B); // --warning
}

/// 暗黑模式颜色
/// 完全对齐Web端暗黑模式CSS变量
class AppColorsDark {
  // 主色调（暗黑模式下更亮）
  static const primary = Color(0xFF818CF8); // --primary (dark)
  static const primaryDark = Color(0xFF6366F1); // --primary-dark (dark)
  static const primaryLight = Color(0xFFA5B4FC); // --primary-light (dark)

  // 背景色（暗色调）
  static const bgPrimary = Color(0xFF1F2937); // --bg-primary (dark)
  static const bgSecondary = Color(0xFF111827); // --bg-secondary (dark)
  static const bgTertiary = Color(0xFF0F172A); // --bg-tertiary (dark)
  static const bgSidebar = Color(0xFF0F172A); // --bg-sidebar (dark)

  // 文字颜色（暗黑模式下更亮）
  static const textPrimary = Color(0xFFF9FAFB); // --text-primary (dark)
  static const textSecondary = Color(0xFF9CA3AF); // --text-secondary (dark)
  static const textTertiary = Color(0xFF6B7280); // --text-tertiary (dark)

  // 边框色（暗色调）
  static const border = Color(0xFF374151); // --border (dark)
  static const borderLight = Color(0xFF4B5563); // --border-light (dark)

  static const shadow = Color(0x33000000); // 暗黑模式下阴影更深

  // 状态颜色（保持不变）
  static const error = Color(0xFFEF4444);
  static const success = Color(0xFF10B981);
  static const warning = Color(0xFFF59E0B);
}