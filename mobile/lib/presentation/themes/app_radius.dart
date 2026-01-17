import 'package:flutter/material.dart';

/// ThinkCraft 圆角系统
/// 完全对齐Web端CSS变量 --border-radius-*
class AppRadius {
  // 基础圆角值
  static const double xs = 4.0;   // --border-radius-xs
  static const double sm = 6.0;   // --border-radius-sm
  static const double md = 8.0;   // --border-radius-md
  static const double lg = 12.0;  // --border-radius-lg
  static const double xl = 16.0;  // --border-radius-xl
  static const double xxl = 24.0; // --border-radius-2xl
  static const double full = 9999.0; // --border-radius-full

  // 组件专用圆角
  static const double button = sm;      // 按钮圆角
  static const double input = sm;       // 输入框圆角
  static const double card = md;        // 卡片圆角
  static const double modal = lg;       // 模态框圆角
  static const double avatar = full;    // 头像圆角
  static const double badge = xs;       // 徽章圆角
  static const double tag = xs;         // 标签圆角

  // 基础圆角形状
  static RoundedRectangleBorder get xsShape =>
      RoundedRectangleBorder(borderRadius: BorderRadius.circular(xs));

  static RoundedRectangleBorder get smShape =>
      RoundedRectangleBorder(borderRadius: BorderRadius.circular(sm));

  static RoundedRectangleBorder get mdShape =>
      RoundedRectangleBorder(borderRadius: BorderRadius.circular(md));

  static RoundedRectangleBorder get lgShape =>
      RoundedRectangleBorder(borderRadius: BorderRadius.circular(lg));

  static RoundedRectangleBorder get xlShape =>
      RoundedRectangleBorder(borderRadius: BorderRadius.circular(xl));

  static RoundedRectangleBorder get xxlShape =>
      RoundedRectangleBorder(borderRadius: BorderRadius.circular(xxl));

  // 单个圆角值（用于需要具体Radius值的场景）
  static Radius get xsRadius => const Radius.circular(xs);
  static Radius get smRadius => const Radius.circular(sm);
  static Radius get mdRadius => const Radius.circular(md);
  static Radius get lgRadius => const Radius.circular(lg);
  static Radius get xlRadius => const Radius.circular(xl);
  static Radius get xxlRadius => const Radius.circular(xxl);

  // 组件专用形状
  static RoundedRectangleBorder get buttonShape =>
      RoundedRectangleBorder(borderRadius: BorderRadius.circular(button));

  static RoundedRectangleBorder get inputShape =>
      RoundedRectangleBorder(borderRadius: BorderRadius.circular(input));

  static RoundedRectangleBorder get cardShape =>
      RoundedRectangleBorder(borderRadius: BorderRadius.circular(card));

  static RoundedRectangleBorder get modalShape =>
      RoundedRectangleBorder(borderRadius: BorderRadius.circular(modal));

  // 方向性圆角
  static BorderRadius get topXs => const BorderRadius.vertical(top: Radius.circular(xs));
  static BorderRadius get topSm => const BorderRadius.vertical(top: Radius.circular(sm));
  static BorderRadius get topMd => const BorderRadius.vertical(top: Radius.circular(md));
  static BorderRadius get topLg => const BorderRadius.vertical(top: Radius.circular(lg));

  static BorderRadius get bottomXs => const BorderRadius.vertical(bottom: Radius.circular(xs));
  static BorderRadius get bottomSm => const BorderRadius.vertical(bottom: Radius.circular(sm));
  static BorderRadius get bottomMd => const BorderRadius.vertical(bottom: Radius.circular(md));
  static BorderRadius get bottomLg => const BorderRadius.vertical(bottom: Radius.circular(lg));

  static BorderRadius get leftXs => const BorderRadius.horizontal(left: Radius.circular(xs));
  static BorderRadius get leftSm => const BorderRadius.horizontal(left: Radius.circular(sm));
  static BorderRadius get leftMd => const BorderRadius.horizontal(left: Radius.circular(md));
  static BorderRadius get leftLg => const BorderRadius.horizontal(left: Radius.circular(lg));

  static BorderRadius get rightXs => const BorderRadius.horizontal(right: Radius.circular(xs));
  static BorderRadius get rightSm => const BorderRadius.horizontal(right: Radius.circular(sm));
  static BorderRadius get rightMd => const BorderRadius.horizontal(right: Radius.circular(md));
  static BorderRadius get rightLg => const BorderRadius.horizontal(right: Radius.circular(lg));

  // 工具方法：创建自定义圆角
  static BorderRadius custom(double radius) => BorderRadius.circular(radius);

  static BorderRadius only({
    double? topLeft,
    double? topRight,
    double? bottomLeft,
    double? bottomRight,
  }) => BorderRadius.only(
    topLeft: Radius.circular(topLeft ?? 0),
    topRight: Radius.circular(topRight ?? 0),
    bottomLeft: Radius.circular(bottomLeft ?? 0),
    bottomRight: Radius.circular(bottomRight ?? 0),
  );

  static BorderRadius vertical(double radius) => BorderRadius.vertical(
    top: Radius.circular(radius),
    bottom: Radius.circular(radius),
  );

  static BorderRadius horizontal(double radius) => BorderRadius.horizontal(
    left: Radius.circular(radius),
    right: Radius.circular(radius),
  );
}