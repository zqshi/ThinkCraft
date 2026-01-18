import 'package:flutter/material.dart';

import 'app.dart';
import 'infrastructure/di/injection.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // 等待DI初始化完成
  await configureDependencies();

  // 简化版：无需Sentry监控，应用只做重定向
  runApp(const ThinkCraftApp());
}
