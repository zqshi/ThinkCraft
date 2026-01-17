import 'package:flutter/material.dart';
import 'app_colors.dart';
import 'app_spacing.dart';
import 'app_radius.dart';
import 'app_shadows.dart';

/// ThinkCraft 主题系统
/// 完全对齐Web端CSS变量，支持亮色/暗黑模式
class AppTheme {
  // ==================== 亮色主题 ====================
  static ThemeData get light {
    const colorScheme = ColorScheme.light(
      primary: AppColors.primary,
      onPrimary: Colors.white,
      secondary: AppColors.textSecondary,
      onSecondary: Color(0xFFFFFFFF),
      surface: AppColors.bgPrimary,
      onSurface: AppColors.textPrimary,
      error: AppColors.error,
      onError: Colors.white,
    );

    return _buildTheme(colorScheme, isDark: false);
  }

  // ==================== 暗黑主题 ====================
  static ThemeData get dark {
    const colorScheme = ColorScheme.dark(
      primary: AppColorsDark.primary,
      onPrimary: Colors.white,
      secondary: AppColorsDark.textSecondary,
      onSecondary: Color(0xFFFFFFFF),
      surface: AppColorsDark.bgPrimary,
      onSurface: AppColorsDark.textPrimary,
      error: AppColorsDark.error,
      onError: Colors.white,
    );

    return _buildTheme(colorScheme, isDark: true);
  }

  // ==================== 通用主题构建器 ====================
  static ThemeData _buildTheme(ColorScheme colorScheme, {required bool isDark}) {
    // 选择对应模式的颜色常量
    final borderColor = isDark ? AppColorsDark.border : AppColors.border;
    final textTertiary = isDark ? AppColorsDark.textTertiary : AppColors.textTertiary;
    final textSecondary = isDark ? AppColorsDark.textSecondary : AppColors.textSecondary;
    final bgSidebar = isDark ? AppColorsDark.bgSidebar : AppColors.bgSidebar;

    final baseTheme = isDark ? ThemeData.dark() : ThemeData.light();

    // 字体系统（对应Web端 --font-size-* + 行高）
    final textTheme = baseTheme.textTheme.copyWith(
      titleLarge: baseTheme.textTheme.titleLarge?.copyWith(
        fontSize: 18, // --font-size-lg: 18px
        fontWeight: FontWeight.w700,
        height: 1.5, // 对齐Web端标题行高
      ),
      titleMedium: baseTheme.textTheme.titleMedium?.copyWith(
        fontSize: 16, // --font-size-md
        fontWeight: FontWeight.w600,
        height: 1.5,
      ),
      titleSmall: baseTheme.textTheme.titleSmall?.copyWith(
        fontSize: 14, // --font-size-sm
        fontWeight: FontWeight.w600,
        height: 1.5,
      ),
      bodyLarge: baseTheme.textTheme.bodyLarge?.copyWith(
        fontSize: 14,
        height: 1.6, // 对齐Web端正文行高
      ),
      bodyMedium: baseTheme.textTheme.bodyMedium?.copyWith(
        fontSize: 14,
        height: 1.6,
      ),
      bodySmall: baseTheme.textTheme.bodySmall?.copyWith(
        fontSize: 13,
        height: 1.6,
      ),
      labelLarge: baseTheme.textTheme.labelLarge?.copyWith(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        height: 1.5,
      ),
      labelMedium: baseTheme.textTheme.labelMedium?.copyWith(
        fontSize: 13,
        height: 1.5,
      ),
      labelSmall: baseTheme.textTheme.labelSmall?.copyWith(
        fontSize: 12, // --font-size-xs
        height: 1.5,
      ),
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: colorScheme.surface,
      textTheme: textTheme,
      iconTheme: IconThemeData(color: textSecondary),

      // AppBar主题
      appBarTheme: AppBarTheme(
        backgroundColor: colorScheme.surface,
        elevation: 0,
        titleTextStyle: textTheme.titleLarge?.copyWith(
          color: colorScheme.onSurface,
          fontWeight: FontWeight.w600,
        ),
        iconTheme: IconThemeData(color: textSecondary),
      ),

      // Card主题（使用新的圆角系统 + 阴影系统）
      cardTheme: CardThemeData(
        color: colorScheme.surface,
        elevation: 0, // 使用自定义BoxShadow而非Material elevation
        shadowColor: Colors.transparent,
        margin: EdgeInsets.zero,
        shape: AppRadius.mdShape, // 使用主题系统的圆角
      ),

      // 输入框主题（使用新的圆角和间距系统）
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: colorScheme.surface,
        hintStyle: TextStyle(color: textTertiary),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.sm), // --border-radius-sm
          borderSide: BorderSide(color: borderColor, width: 2), // 对齐Web端2px
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.sm),
          borderSide: BorderSide(color: borderColor, width: 2),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.sm),
          borderSide: BorderSide(color: colorScheme.primary, width: 2),
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 14,
          vertical: 12,
        ),
      ),

      // ElevatedButton主题（使用新的圆角和间距系统 + hover悬浮效果）
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ButtonStyle(
          // 对齐Web端 .btn-primary:hover { background: var(--primary-dark); }
          backgroundColor: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.hovered)) {
              return isDark ? AppColorsDark.primaryDark : AppColors.primaryDark;
            }
            if (states.contains(WidgetState.pressed)) {
              return isDark ? AppColorsDark.primaryDark.withOpacity(0.9) : AppColors.primaryDark.withOpacity(0.9);
            }
            return colorScheme.primary; // --primary
          }),
          foregroundColor: WidgetStateProperty.all(colorScheme.onPrimary),
          padding: WidgetStateProperty.all(AppSpacing.buttonPadding),
          minimumSize: WidgetStateProperty.all(const Size(0, 40)),
          // 对齐Web端 box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3)
          elevation: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.hovered)) {
              return 4; // hover时增加阴影
            }
            if (states.contains(WidgetState.pressed)) {
              return 1; // pressed时减少
            }
            return 2; // 正常状态轻微阴影
          }),
          shadowColor: WidgetStateProperty.all(
            const Color(0x4D6366F1), // rgba(99, 102, 241, 0.3)
          ),
          shape: WidgetStateProperty.all(AppRadius.buttonShape),
          textStyle: WidgetStateProperty.all(
            textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w600),
          ),
        ),
      ),

      // OutlinedButton主题
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: colorScheme.onSurface,
          backgroundColor: colorScheme.surface,
          side: BorderSide(color: borderColor),
          padding: AppSpacing.buttonPadding,
          minimumSize: const Size(0, 40),
          shape: AppRadius.buttonShape,
          textStyle: textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w500),
        ),
      ),

      // TextButton主题
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: colorScheme.primary,
          textStyle: textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w600),
        ),
      ),

      // ListTile主题
      listTileTheme: ListTileThemeData(
        iconColor: colorScheme.onSurface.withOpacity(0.7),
        textColor: colorScheme.onSurface,
        dense: true,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 12, // 12px
          vertical: 4, // 4px
        ),
      ),

      // Divider主题
      dividerTheme: DividerThemeData(
        color: borderColor,
        thickness: 1,
      ),

      // Dialog主题（使用新的圆角系统 + 阴影系统）
      dialogTheme: DialogThemeData(
        backgroundColor: colorScheme.surface,
        shape: AppRadius.modalShape, // --border-radius-lg
        elevation: 0, // 使用自定义阴影替代Material elevation
      ),

      // BottomSheet主题
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: colorScheme.surface,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(
            top: Radius.circular(AppRadius.xl), // --border-radius-xl
          ),
        ),
      ),

      // Drawer主题
      drawerTheme: DrawerThemeData(
        backgroundColor: bgSidebar,
        elevation: 0,
      ),

      // SnackBar主题
      snackBarTheme: SnackBarThemeData(
        backgroundColor: colorScheme.surface,
        contentTextStyle: textTheme.bodyMedium?.copyWith(
          color: colorScheme.onSurface,
        ),
        actionTextColor: colorScheme.primary,
        shape: AppRadius.smShape,
        behavior: SnackBarBehavior.floating,
      ),

      // Chip主题
      chipTheme: ChipThemeData(
        backgroundColor: colorScheme.surface,
        selectedColor: colorScheme.primary.withOpacity(0.1),
        labelStyle: textTheme.bodySmall?.copyWith(
          color: colorScheme.onSurface,
        ),
        side: BorderSide(color: borderColor),
        shape: const StadiumBorder(),
      ),

      // 触摸反馈
      splashFactory: InkRipple.splashFactory,
      highlightColor: colorScheme.primary.withOpacity(0.1),
      splashColor: colorScheme.primary.withOpacity(0.05),
    );
  }

  // 工具方法：获取当前主题的颜色常量
  static Color primaryColor(BuildContext context) {
    return Theme.of(context).colorScheme.primary;
  }

  static Color backgroundColor(BuildContext context) {
    return Theme.of(context).scaffoldBackgroundColor;
  }

  static Color textColor(BuildContext context) {
    return Theme.of(context).colorScheme.onSurface;
  }

  static Color borderColor(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return isDark ? AppColorsDark.border : AppColors.border;
  }

  // 响应式工具
  static bool isMobile(BuildContext context) {
    return MediaQuery.of(context).size.width < 640;
  }

  static bool isTablet(BuildContext context) {
    final width = MediaQuery.of(context).size.width;
    return width >= 640 && width < 1024;
  }

  static bool isDesktop(BuildContext context) {
    return MediaQuery.of(context).size.width >= 1024;
  }
}
