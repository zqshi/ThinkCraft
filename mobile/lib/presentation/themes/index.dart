/// ThinkCraft 主题系统统一导出
/// 完全对齐Web端CSS变量体系
///
/// 使用方式：
/// ```dart
/// import 'package:frontend/presentation/themes/index.dart';
///
/// // 使用颜色
/// Container(color: AppColors.primary);
///
/// // 使用间距
/// Padding(padding: EdgeInsets.all(AppSpacing.md));
///
/// // 使用圆角
/// BorderRadius: AppRadius.smRadius;
///
/// // 使用阴影
/// boxShadow: AppShadows.md;
///
/// // 使用断点
/// if (AppBreakpoints.isDesktopMode(width)) { ... }
///
/// // 使用动画
/// AnimatedButton(onTap: () {}, child: Text('按钮'));
/// ```
library;

// 颜色系统
export 'app_colors.dart';

// 间距系统
export 'app_spacing.dart';

// 圆角系统
export 'app_radius.dart';

// 阴影系统
export 'app_shadows.dart';

// 断点系统
export 'app_breakpoints.dart';

// 动画系统
export 'app_animations.dart';

// 主题配置
export 'app_theme.dart';
