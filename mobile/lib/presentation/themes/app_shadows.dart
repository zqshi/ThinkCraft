import 'package:flutter/material.dart';

/// ThinkCraft 阴影系统
/// 完全对齐Web端CSS变量 --shadow-*
class AppShadows {
  // 基础阴影（对应CSS box-shadow）
  static const BoxShadow xs = BoxShadow(
    color: Color(0x0D000000), // rgba(0, 0, 0, 0.05)
    blurRadius: 1,
    spreadRadius: 0,
    offset: Offset(0, 1),
  );

  static const BoxShadow sm = BoxShadow(
    color: Color(0x0D000000), // rgba(0, 0, 0, 0.05)
    blurRadius: 2,
    spreadRadius: 0,
    offset: Offset(0, 1),
  );

  static const BoxShadow md = BoxShadow(
    color: Color(0x1A000000), // rgba(0, 0, 0, 0.1)
    blurRadius: 4,
    spreadRadius: -1,
    offset: Offset(0, 2),
  );

  static const BoxShadow lg = BoxShadow(
    color: Color(0x1A000000), // rgba(0, 0, 0, 0.1)
    blurRadius: 10,
    spreadRadius: -2,
    offset: Offset(0, 4),
  );

  static const BoxShadow xl = BoxShadow(
    color: Color(0x1A000000), // rgba(0, 0, 0, 0.1)
    blurRadius: 16,
    spreadRadius: -4,
    offset: Offset(0, 8),
  );

  static const BoxShadow xxl = BoxShadow(
    color: Color(0x1A000000), // rgba(0, 0, 0, 0.1)
    blurRadius: 25,
    spreadRadius: -5,
    offset: Offset(0, 12),
  );

  // 组件专用阴影
  static const BoxShadow card = BoxShadow(
    color: Color(0x0D000000), // rgba(0, 0, 0, 0.05)
    blurRadius: 4,
    spreadRadius: 0,
    offset: Offset(0, 1),
  );

  static const BoxShadow button = BoxShadow(
    color: Color(0x4D6366F1), // rgba(99, 102, 241, 0.3)
    blurRadius: 12,
    spreadRadius: 0,
    offset: Offset(0, 4),
  );

  static const BoxShadow modal = BoxShadow(
    color: Color(0x33000000), // rgba(0, 0, 0, 0.2)
    blurRadius: 20,
    spreadRadius: -4,
    offset: Offset(0, 10),
  );

  static const BoxShadow dropdown = BoxShadow(
    color: Color(0x1A000000), // rgba(0, 0, 0, 0.1)
    blurRadius: 10,
    spreadRadius: -2,
    offset: Offset(0, 4),
  );

  static const BoxShadow inputTop = BoxShadow(
    color: Color(0x1A000000), // rgba(0, 0, 0, 0.1)
    blurRadius: 8,
    spreadRadius: 0,
    offset: Offset(0, -2),
  );

  // 暗黑模式阴影（更柔和）
  static const BoxShadow darkXs = BoxShadow(
    color: Color(0x0DFFFFFF), // rgba(255, 255, 255, 0.05)
    blurRadius: 1,
    spreadRadius: 0,
    offset: Offset(0, 1),
  );

  static const BoxShadow darkSm = BoxShadow(
    color: Color(0x0DFFFFFF), // rgba(255, 255, 255, 0.05)
    blurRadius: 2,
    spreadRadius: 0,
    offset: Offset(0, 1),
  );

  static const BoxShadow darkMd = BoxShadow(
    color: Color(0x1AFFFFFF), // rgba(255, 255, 255, 0.1)
    blurRadius: 4,
    spreadRadius: -1,
    offset: Offset(0, 2),
  );

  static const BoxShadow darkLg = BoxShadow(
    color: Color(0x1AFFFFFF), // rgba(255, 255, 255, 0.1)
    blurRadius: 10,
    spreadRadius: -2,
    offset: Offset(0, 4),
  );

  // 组合阴影（多层阴影）
  static List<BoxShadow> get cardLg => [
    card,
    BoxShadow(
      color: Color(0x0D000000),
      blurRadius: 2,
      spreadRadius: 0,
      offset: Offset(0, 1),
    ),
  ];

  static List<BoxShadow> get buttonHover => [
    button,
    BoxShadow(
      color: Color(0x336366F1),
      blurRadius: 8,
      spreadRadius: -2,
      offset: Offset(0, 2),
    ),
  ];

  static List<BoxShadow> get modalLg => [
    modal,
    BoxShadow(
      color: Color(0x1A000000),
      blurRadius: 10,
      spreadRadius: -2,
      offset: Offset(0, 4),
    ),
  ];

  // 工具方法：创建自定义阴影
  static BoxShadow custom({
    required Color color,
    double blurRadius = 4,
    double spreadRadius = 0,
    Offset offset = const Offset(0, 2),
  }) {
    return BoxShadow(
      color: color,
      blurRadius: blurRadius,
      spreadRadius: spreadRadius,
      offset: offset,
    );
  }

  static List<BoxShadow> multiple(List<BoxShadow> shadows) => shadows;

  // 内阴影（用于特殊效果）
  static BoxShadow inner({
    Color color = const Color(0x1A000000),
    double blurRadius = 4,
    Offset offset = const Offset(0, 2),
  }) {
    return BoxShadow(
      color: color,
      blurRadius: blurRadius,
      offset: offset,
      spreadRadius: 0,
      blurStyle: BlurStyle.inner,
    );
  }
}