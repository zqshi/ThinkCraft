import 'package:get_it/get_it.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../services/settings_service.dart';

final GetIt getIt = GetIt.instance;

/// 简化版依赖注入配置
/// Flutter Web应用仅作为重定向入口，只需要基础的设置服务
Future<void> configureDependencies() async {
  if (getIt.isRegistered<SharedPreferences>()) {
    return;
  }

  // 初始化SharedPreferences
  final prefs = await SharedPreferences.getInstance();
  getIt.registerSingleton<SharedPreferences>(prefs);

  // 注册设置服务
  getIt.registerSingleton<SettingsService>(
    SettingsService(getIt<SharedPreferences>()),
  );
}
