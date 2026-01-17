import 'package:shared_preferences/shared_preferences.dart';

/// 认证状态数据
class AuthState {
  final bool isLoggedIn;
  final String username;
  final String displayName;

  const AuthState({
    this.isLoggedIn = false,
    this.username = '',
    this.displayName = 'ThinkCraft 用户',
  });

  AuthState copyWith({
    bool? isLoggedIn,
    String? username,
    String? displayName,
  }) {
    return AuthState(
      isLoggedIn: isLoggedIn ?? this.isLoggedIn,
      username: username ?? this.username,
      displayName: displayName ?? this.displayName,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is AuthState &&
          runtimeType == other.runtimeType &&
          isLoggedIn == other.isLoggedIn &&
          username == other.username &&
          displayName == other.displayName;

  @override
  int get hashCode =>
      isLoggedIn.hashCode ^ username.hashCode ^ displayName.hashCode;
}

/// 认证服务（对齐Web端登录逻辑）
/// 管理登录状态的持久化，对应Web端localStorage.get('thinkcraft_logged_in')
class AuthService {
  static const String _loggedInKey = 'thinkcraft_logged_in';
  static const String _usernameKey = 'thinkcraft_username';

  final SharedPreferences _prefs;

  AuthService(this._prefs);

  /// 检查登录状态
  AuthState checkAuthState() {
    final isLoggedIn = _prefs.getBool(_loggedInKey) ?? false;
    final username = _prefs.getString(_usernameKey) ?? '';

    if (!isLoggedIn) {
      return const AuthState();
    }

    // 查找对应的测试账号显示名
    final displayName = _getDisplayName(username);

    return AuthState(
      isLoggedIn: true,
      username: username,
      displayName: displayName,
    );
  }

  /// 登录（对齐Web端login逻辑）
  /// 验证测试账号并保存登录状态到SharedPreferences
  Future<bool> login(String username, String password) async {
    // 验证测试账号（对齐Web端TEST_ACCOUNTS）
    if ((username == 'admin' && password == 'admin123') ||
        (username == 'demo' && password == 'demo123')) {
      await _prefs.setBool(_loggedInKey, true);
      await _prefs.setString(_usernameKey, username);
      return true;
    }
    return false;
  }

  /// 登出（对齐Web端logout逻辑）
  /// 清除localStorage中的登录状态
  Future<void> logout() async {
    await _prefs.remove(_loggedInKey);
    await _prefs.remove(_usernameKey);
  }

  /// 获取显示名称（对齐Web端测试账号名称）
  String _getDisplayName(String username) {
    switch (username) {
      case 'admin':
        return '管理员';
      case 'demo':
        return '演示用户';
      default:
        return 'ThinkCraft 用户';
    }
  }
}
