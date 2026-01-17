import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../infrastructure/services/settings_service.dart';
import '../../infrastructure/services/auth_service.dart';

/// 应用全局状态（包含设置+认证）
class AppState {
  final AppSettings settings;
  final AuthState auth;
  final bool showLogoutOverlay;

  const AppState({
    required this.settings,
    required this.auth,
    this.showLogoutOverlay = false,
  });

  AppState copyWith({
    AppSettings? settings,
    AuthState? auth,
    bool? showLogoutOverlay,
  }) {
    return AppState(
      settings: settings ?? this.settings,
      auth: auth ?? this.auth,
      showLogoutOverlay: showLogoutOverlay ?? this.showLogoutOverlay,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is AppState &&
          runtimeType == other.runtimeType &&
          settings == other.settings &&
          auth == other.auth &&
          showLogoutOverlay == other.showLogoutOverlay;

  @override
  int get hashCode =>
      settings.hashCode ^ auth.hashCode ^ showLogoutOverlay.hashCode;
}

/// 应用状态Notifier
class AppStateNotifier extends StateNotifier<AppState> {
  final SettingsService _settingsService;
  final AuthService _authService;

  AppStateNotifier(this._settingsService, this._authService)
      : super(AppState(
          settings: _settingsService.loadSettings(),
          auth: _authService.checkAuthState(),
        ));

  /// 更新设置
  Future<void> updateSettings(AppSettings newSettings) async {
    await _settingsService.saveSettings(newSettings);
    state = state.copyWith(settings: newSettings);
  }

  /// 切换暗色模式
  Future<void> toggleDarkMode(bool enabled) async {
    final newSettings = state.settings.copyWith(darkMode: enabled);
    await updateSettings(newSettings);
  }

  /// 切换保存历史
  Future<void> toggleSaveHistory(bool enabled) async {
    final newSettings = state.settings.copyWith(saveHistory: enabled);
    await updateSettings(newSettings);
  }

  /// 切换团队功能
  Future<void> toggleEnableTeam(bool enabled) async {
    final newSettings = state.settings.copyWith(enableTeam: enabled);
    await updateSettings(newSettings);
  }

  /// 更新字体大小
  Future<void> updateFontSize(double size) async {
    final newSettings = state.settings.copyWith(fontSize: size);
    await updateSettings(newSettings);
  }

  /// 更新API URL
  Future<void> updateApiUrl(String url) async {
    final newSettings = state.settings.copyWith(apiUrl: url);
    await updateSettings(newSettings);
  }

  /// 登录
  Future<bool> login(String username, String password) async {
    final success = await _authService.login(username, password);
    if (success) {
      final authState = _authService.checkAuthState();
      state = state.copyWith(auth: authState);
    }
    return success;
  }

  /// 登出（对齐Web端完整流程）
  /// 1. 显示白色遮罩防止敏感信息泄漏
  /// 2. 清除登录状态
  /// 3. 更新认证状态
  Future<void> logout() async {
    // 1. 显示白色遮罩（防止敏感信息泄漏）
    state = state.copyWith(showLogoutOverlay: true);

    // 2. 等待一小段时间确保UI更新
    await Future.delayed(const Duration(milliseconds: 100));

    // 3. 清除登录状态
    await _authService.logout();

    // 4. 更新认证状态为未登录
    state = state.copyWith(
      auth: const AuthState(),
      showLogoutOverlay: false, // 登录Modal显示后会隐藏overlay
    );
  }

  /// 清除所有历史记录
  Future<void> clearAllHistory() async {
    // TODO: 调用对应的domain service清除对话、报告等数据
    // 暂时只清除设置
    await _settingsService.clearSettings();
    state = state.copyWith(settings: const AppSettings());
  }
}
