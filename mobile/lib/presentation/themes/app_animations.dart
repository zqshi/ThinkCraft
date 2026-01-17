import 'package:flutter/material.dart';

/// ThinkCraft 动画系统
/// 从Web端CSS变量迁移：--animation-duration-* 和动画效果
class AppAnimations {
  // ==================== 动画时长（对应Web端CSS变量）====================
  static const Duration fast = Duration(milliseconds: 150); // --animation-duration-fast
  static const Duration medium = Duration(milliseconds: 200); // 0.2s - Web端微动画（输入框聚焦、hover等）
  static const Duration normal = Duration(milliseconds: 300); // --animation-duration-normal
  static const Duration slow = Duration(milliseconds: 500); // --animation-duration-slow

  // ==================== 动画曲线 ====================
  static const Curve defaultCurve = Curves.easeOut;
  static const Curve bounceCurve = Curves.easeInOut;

  // ==================== 按钮点击缩放动画（对应Web端 transform: scale(0.98)）====================
  /// 按钮点击时缩放到0.98
  static const double buttonScaleActive = 0.98;

  /// 按钮默认缩放1.0
  static const double buttonScaleNormal = 1.0;

  // ==================== 卡片悬停位移动画（对应Web端 transform: translateY(-2px)）====================
  /// 卡片悬停时向上位移2px
  static const double cardHoverOffsetY = -2.0;

  /// 卡片默认位移0
  static const double cardNormalOffsetY = 0.0;

  // ==================== 侧边栏滑入滑出（对应Web端 transition: transform 0.3s ease）====================
  /// 侧边栏滑入滑出动画时长
  static const Duration sidebarTransition = Duration(milliseconds: 300);

  // ==================== 页面过渡动画 ====================
  /// 创建淡入淡出页面过渡
  static PageRouteBuilder<T> fadeTransition<T>({
    required Widget page,
    Duration duration = normal,
  }) {
    return PageRouteBuilder<T>(
      pageBuilder: (context, animation, secondaryAnimation) => page,
      transitionDuration: duration,
      transitionsBuilder: (context, animation, secondaryAnimation, child) {
        return FadeTransition(
          opacity: animation,
          child: child,
        );
      },
    );
  }

  /// 创建从右侧滑入的页面过渡
  static PageRouteBuilder<T> slideTransition<T>({
    required Widget page,
    Duration duration = normal,
  }) {
    return PageRouteBuilder<T>(
      pageBuilder: (context, animation, secondaryAnimation) => page,
      transitionDuration: duration,
      transitionsBuilder: (context, animation, secondaryAnimation, child) {
        const begin = Offset(1.0, 0.0);
        const end = Offset.zero;
        final tween = Tween(begin: begin, end: end);
        final offsetAnimation = animation.drive(tween);

        return SlideTransition(
          position: offsetAnimation,
          child: child,
        );
      },
    );
  }
}

/// 可点击按钮动画包装器
/// 对应Web端的 button:active { transform: scale(0.98); }
class AnimatedButton extends StatefulWidget {
  const AnimatedButton({
    super.key,
    required this.child,
    this.onTap,
    this.scaleActive = AppAnimations.buttonScaleActive,
    this.scaleNormal = AppAnimations.buttonScaleNormal,
    this.duration = AppAnimations.fast,
  });

  final Widget child;
  final VoidCallback? onTap;
  final double scaleActive;
  final double scaleNormal;
  final Duration duration;

  @override
  State<AnimatedButton> createState() => _AnimatedButtonState();
}

class _AnimatedButtonState extends State<AnimatedButton> {
  bool _isPressed = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => setState(() => _isPressed = true),
      onTapUp: (_) => setState(() => _isPressed = false),
      onTapCancel: () => setState(() => _isPressed = false),
      onTap: widget.onTap,
      child: AnimatedScale(
        scale: _isPressed ? widget.scaleActive : widget.scaleNormal,
        duration: widget.duration,
        curve: AppAnimations.defaultCurve,
        child: widget.child,
      ),
    );
  }
}

/// 可悬停卡片动画包装器
/// 对应Web端的 card:hover { transform: translateY(-2px); }
class AnimatedCard extends StatefulWidget {
  const AnimatedCard({
    super.key,
    required this.child,
    this.onTap,
    this.hoverOffsetY = AppAnimations.cardHoverOffsetY,
    this.normalOffsetY = AppAnimations.cardNormalOffsetY,
    this.duration = AppAnimations.fast,
    this.enableHoverEffect = true,
  });

  final Widget child;
  final VoidCallback? onTap;
  final double hoverOffsetY;
  final double normalOffsetY;
  final Duration duration;
  final bool enableHoverEffect;

  @override
  State<AnimatedCard> createState() => _AnimatedCardState();
}

class _AnimatedCardState extends State<AnimatedCard> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: widget.enableHoverEffect ? (_) => setState(() => _isHovered = true) : null,
      onExit: widget.enableHoverEffect ? (_) => setState(() => _isHovered = false) : null,
      child: GestureDetector(
        onTap: widget.onTap,
        child: AnimatedContainer(
          duration: widget.duration,
          curve: AppAnimations.defaultCurve,
          transform: Matrix4.translationValues(
            0,
            _isHovered ? widget.hoverOffsetY : widget.normalOffsetY,
            0,
          ),
          child: widget.child,
        ),
      ),
    );
  }
}
