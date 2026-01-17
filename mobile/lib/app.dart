import 'package:flutter/material.dart';

import 'presentation/routing/app_router.dart';

/// ThinkCraft 应用主组件（简化版）
/// Flutter Web应用仅作为重定向入口，立即跳转到8082端口的完整Web应用
class ThinkCraftApp extends StatelessWidget {
  const ThinkCraftApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'ThinkCraft',
      routerConfig: AppRouter.router,
      debugShowCheckedModeBanner: false,
    );
  }
}
