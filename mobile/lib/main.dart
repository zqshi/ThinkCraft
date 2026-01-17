import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

import 'app.dart';
import 'infrastructure/di/injection.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // 等待DI初始化完成（SharedPreferences需要异步初始化）
  await configureDependencies();

  await SentryFlutter.init(
    (options) {
      options.dsn = const String.fromEnvironment('SENTRY_DSN');
      options.environment =
          const String.fromEnvironment('ENV', defaultValue: 'development');
    },
    appRunner: () => runApp(const ProviderScope(child: ThinkCraftApp())),
  );
}
