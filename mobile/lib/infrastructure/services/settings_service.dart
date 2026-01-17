import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

/// 设置数据模型（对齐Web端state.settings）
class AppSettings {
  final bool darkMode;
  final bool saveHistory;
  final bool enableTeam;
  final String apiUrl;
  final double fontSize;
  final String language;

  const AppSettings({
    this.darkMode = false,
    this.saveHistory = true,
    this.enableTeam = true,
    this.apiUrl = 'http://localhost:3000',
    this.fontSize = 14.0,
    this.language = 'zh-CN',
  });

  /// 从JSON反序列化
  factory AppSettings.fromJson(Map<String, dynamic> json) {
    return AppSettings(
      darkMode: json['darkMode'] as bool? ?? false,
      saveHistory: json['saveHistory'] as bool? ?? true,
      enableTeam: json['enableTeam'] as bool? ?? true,
      apiUrl: json['apiUrl'] as String? ?? 'http://localhost:3000',
      fontSize: (json['fontSize'] as num?)?.toDouble() ?? 14.0,
      language: json['language'] as String? ?? 'zh-CN',
    );
  }

  /// 序列化为JSON
  Map<String, dynamic> toJson() {
    return {
      'darkMode': darkMode,
      'saveHistory': saveHistory,
      'enableTeam': enableTeam,
      'apiUrl': apiUrl,
      'fontSize': fontSize,
      'language': language,
    };
  }

  /// copyWith方法用于创建修改后的副本
  AppSettings copyWith({
    bool? darkMode,
    bool? saveHistory,
    bool? enableTeam,
    String? apiUrl,
    double? fontSize,
    String? language,
  }) {
    return AppSettings(
      darkMode: darkMode ?? this.darkMode,
      saveHistory: saveHistory ?? this.saveHistory,
      enableTeam: enableTeam ?? this.enableTeam,
      apiUrl: apiUrl ?? this.apiUrl,
      fontSize: fontSize ?? this.fontSize,
      language: language ?? this.language,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is AppSettings &&
          runtimeType == other.runtimeType &&
          darkMode == other.darkMode &&
          saveHistory == other.saveHistory &&
          enableTeam == other.enableTeam &&
          apiUrl == other.apiUrl &&
          fontSize == other.fontSize &&
          language == other.language;

  @override
  int get hashCode =>
      darkMode.hashCode ^
      saveHistory.hashCode ^
      enableTeam.hashCode ^
      apiUrl.hashCode ^
      fontSize.hashCode ^
      language.hashCode;
}

/// 设置持久化服务
/// 对齐Web端localStorage的thinkcraft_settings功能
class SettingsService {
  static const String _settingsKey = 'thinkcraft_settings';
  final SharedPreferences _prefs;

  SettingsService(this._prefs);

  /// 加载设置（对齐Web端loadSettings）
  AppSettings loadSettings() {
    final jsonString = _prefs.getString(_settingsKey);
    if (jsonString == null) {
      return const AppSettings(); // 返回默认值
    }
    try {
      final json = jsonDecode(jsonString) as Map<String, dynamic>;
      return AppSettings.fromJson(json);
    } catch (e) {
      // 解析失败时返回默认值
      return const AppSettings();
    }
  }

  /// 保存设置（对齐Web端saveSettings）
  Future<bool> saveSettings(AppSettings settings) async {
    final jsonString = jsonEncode(settings.toJson());
    return await _prefs.setString(_settingsKey, jsonString);
  }

  /// 清除所有设置
  Future<bool> clearSettings() async {
    return await _prefs.remove(_settingsKey);
  }
}
