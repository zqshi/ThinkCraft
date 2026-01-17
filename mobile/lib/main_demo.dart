import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'config/app_config.dart';
import 'presentation/themes/app_theme.dart';
import 'presentation/pages/home/home_page.dart';

/// 演示模式入口
void main() {
  runApp(DemoApp());
}

class DemoApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return ProviderScope(
      child: MaterialApp(
        title: 'ThinkCraft Demo',
        theme: AppTheme.light,
        darkTheme: AppTheme.dark,
        themeMode: ThemeMode.system,
        home: DemoHomePage(),
        debugShowCheckedModeBanner: false,
      ),
    );
  }
}

class DemoHomePage extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('ThinkCraft 演示模式'),
        actions: [
          IconButton(
            icon: Icon(Icons.info_outline),
            onPressed: () => _showDemoInfo(context),
          ),
        ],
      ),
      body: HomePage(), // 使用相同的HomePage，但通过配置控制功能
    );
  }

  void _showDemoInfo(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('演示模式'),
        content: Text('当前运行在演示模式，部分功能已被简化或禁用。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('了解'),
          ),
        ],
      ),
    );
  }
}