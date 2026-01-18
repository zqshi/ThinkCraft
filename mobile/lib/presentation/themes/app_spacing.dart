import 'package:flutter/material.dart';

/// ThinkCraft 间距系统
/// 完全对齐Web端CSS变量 --spacing-*
class AppSpacing {
  // 基础间距单位（4px网格系统）
  static const double xs = 4.0;   // --spacing-xs
  static const double sm = 8.0;   // --spacing-sm
  static const double md = 16.0;  // --spacing-md
  static const double lg = 24.0;  // --spacing-lg
  static const double xl = 32.0;  // --spacing-xl
  static const double xxl = 48.0; // --spacing-2xl

  // 组件专用间距
  static const double buttonHorizontal = md; // 按钮水平内边距
  static const double buttonVertical = sm;   // 按钮垂直内边距
  static const double cardPadding = md;      // 卡片内边距
  static const double inputPadding = md;     // 输入框内边距
  static const double sectionMargin = xl;    // 区块间距

  // 工具方法：生成EdgeInsets
  static EdgeInsets get allXs => const EdgeInsets.all(xs);
  static EdgeInsets get allSm => const EdgeInsets.all(sm);
  static EdgeInsets get allMd => const EdgeInsets.all(md);
  static EdgeInsets get allLg => const EdgeInsets.all(lg);
  static EdgeInsets get allXl => const EdgeInsets.all(xl);

  static EdgeInsets get horizontalXs => const EdgeInsets.symmetric(horizontal: xs);
  static EdgeInsets get horizontalSm => const EdgeInsets.symmetric(horizontal: sm);
  static EdgeInsets get horizontalMd => const EdgeInsets.symmetric(horizontal: md);
  static EdgeInsets get horizontalLg => const EdgeInsets.symmetric(horizontal: lg);
  static EdgeInsets get horizontalXl => const EdgeInsets.symmetric(horizontal: xl);

  static EdgeInsets get verticalXs => const EdgeInsets.symmetric(vertical: xs);
  static EdgeInsets get verticalSm => const EdgeInsets.symmetric(vertical: sm);
  static EdgeInsets get verticalMd => const EdgeInsets.symmetric(vertical: md);
  static EdgeInsets get verticalLg => const EdgeInsets.symmetric(vertical: lg);
  static EdgeInsets get verticalXl => const EdgeInsets.symmetric(vertical: xl);

  static EdgeInsets get buttonPadding => const EdgeInsets.symmetric(
    horizontal: buttonHorizontal,
    vertical: buttonVertical,
  );

  static EdgeInsets get cardPaddingAll => const EdgeInsets.all(cardPadding);

  static EdgeInsets get inputPaddingAll => const EdgeInsets.all(inputPadding);
}