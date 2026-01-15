import 'package:flutter/material.dart';

import 'presentation/routing/app_router.dart';
import 'presentation/themes/app_theme.dart';

class ThinkCraftApp extends StatelessWidget {
  const ThinkCraftApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'ThinkCraft',
      theme: AppTheme.light,
      routerConfig: AppRouter.router,
    );
  }
}
