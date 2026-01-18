import 'package:flutter/material.dart';
import 'app_breakpoints.dart';

/// 响应式主题扩展
/// 根据屏幕宽度返回不同的字体大小和间距值
class AppResponsive {
  /// 获取响应式字体大小
  /// 对应Web端CSS变量中的响应式字体定义
  static double getFontSize(BuildContext context, double baseSize) {
    final width = MediaQuery.of(context).size.width;

    // 对应Web端@media查询中的字体大小调整
    if (width <= 480) {
      // 小屏手机: --font-size-sm: 13px, --font-size-md: 15px, etc.
      if (baseSize == 12) return 13; // font-size-xs
      if (baseSize == 14) return 13; // font-size-sm
      if (baseSize == 16) return 15; // font-size-md
      if (baseSize == 18) return 17; // font-size-lg
    } else if (width <= 640) {
      // 标准手机: --font-size-md: 16px
      if (baseSize == 16) return 16;
    } else if (width <= 1024) {
      // 平板: --font-size-lg: 20px, --font-size-xl: 26px
      if (baseSize == 18) return 20;
      if (baseSize == 24) return 26;
    } else if (width > 1920) {
      // 超大屏: --font-size-xl: 28px, --font-size-2xl: 36px
      if (baseSize == 24) return 28;
      if (baseSize == 32) return 36;
    }

    return baseSize;
  }

  /// 获取响应式间距值
  /// 对应Web端CSS变量中的响应式间距定义
  static double getSpacing(BuildContext context, double baseSize) {
    final width = MediaQuery.of(context).size.width;

    // 对应Web端@media查询中的间距调整
    if (width <= 480) {
      // 小屏手机: spacing调整
      if (baseSize == 16) return 12; // spacing-md: 16px -> 12px
      if (baseSize == 24) return 16; // spacing-lg: 24px -> 16px
      if (baseSize == 32) return 24; // spacing-xl: 32px -> 24px
    } else if (width <= 640) {
      // 标准手机
      if (baseSize == 16) return 14; // spacing-md: 16px -> 14px
    } else if (width > 1920) {
      // 超大屏
      if (baseSize == 32) return 48; // spacing-xl: 32px -> 48px
      if (baseSize == 48) return 64; // spacing-2xl: 48px -> 64px
    }

    return baseSize;
  }

  /// 创建响应式TextStyle
  static TextStyle responsiveTextStyle({
    required BuildContext context,
    double? fontSize,
    FontWeight? fontWeight,
    Color? color,
    double? height,
  }) {
    return TextStyle(
      fontSize: fontSize != null ? getFontSize(context, fontSize) : null,
      fontWeight: fontWeight,
      color: color,
      height: height,
    );
  }

  /// 创建响应式EdgeInsets
  static EdgeInsets responsivePadding({
    required BuildContext context,
    double? all,
    double? horizontal,
    double? vertical,
    double? left,
    double? top,
    double? right,
    double? bottom,
  }) {
    double getSpacingValue(double? value) {
      if (value == null) return 0;
      return getSpacing(context, value);
    }

    return EdgeInsets.only(
      left: getSpacingValue(left ?? horizontal ?? all ?? 0),
      top: getSpacingValue(top ?? vertical ?? all ?? 0),
      right: getSpacingValue(right ?? horizontal ?? all ?? 0),
      bottom: getSpacingValue(bottom ?? vertical ?? all ?? 0),
    );
  }
}

/// 响应式Widget包装器
class ResponsiveBuilder extends StatelessWidget {
  const ResponsiveBuilder({
    super.key,
    required this.builder,
  });

  final Widget Function(BuildContext context, double width) builder;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        return builder(context, constraints.maxWidth);
      },
    );
  }
}