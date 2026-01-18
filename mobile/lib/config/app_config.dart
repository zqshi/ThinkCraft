/// 应用配置类
/// 控制演示模式和生产模式的功能开关
class AppConfig {
  // 是否为演示模式
  static const bool isDemoMode = bool.fromEnvironment('DEMO_MODE', defaultValue: false);

  /// 功能开关配置
  static Map<String, dynamic> get features {
    if (isDemoMode) {
      return {
        'multimodal': false,      // 多模态功能（语音、图像等）
        'sentry': false,          // 错误监控
        'analytics': false,       // 数据分析
        'full_features': false,   // 完整功能
        'theme_switch': true,     // 主题切换（演示用）
        'mock_data': true,        // 使用模拟数据
      };
    }
    return {
      'multimodal': true,
      'sentry': true,
      'analytics': true,
      'full_features': true,
      'theme_switch': true,
      'mock_data': false,
    };
  }

  /// 检查是否启用某个功能
  static bool isFeatureEnabled(String feature) {
    return features[feature] ?? false;
  }
}