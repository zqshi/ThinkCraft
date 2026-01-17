import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'presentation/routing/app_router.dart';
import 'presentation/themes/app_theme.dart';
import 'application/state/providers.dart';

/// ThinkCraft 应用主组件
/// 支持亮色/暗黑模式切换（用户手动切换或跟随系统）
class ThinkCraftApp extends ConsumerWidget {
  const ThinkCraftApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // 监听主题模式变化（从设置中读取）
    final themeMode = ref.watch(themeModeProvider);

    return MaterialApp.router(
      title: 'ThinkCraft',

      // 亮色主题（完全对齐Web端CSS变量）
      theme: AppTheme.light,

      // 暗黑主题（完全对齐Web端暗黑模式CSS）
      darkTheme: AppTheme.dark,

      // 动态主题模式（对齐Web端darkMode设置）
      themeMode: themeMode,

      routerConfig: AppRouter.router,

      // 调试模式不显示横幅
      debugShowCheckedModeBanner: false,
    );
  }
}
