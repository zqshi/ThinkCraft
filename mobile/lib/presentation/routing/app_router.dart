import 'package:go_router/go_router.dart';

import '../pages/webview/web_app_page.dart';

/// 简化后的路由配置
/// Flutter Web应用仅作为重定向入口，所有业务逻辑在8082端口的Web应用中
class AppRouter {
  static final GoRouter router = GoRouter(
    routes: [
      // 根路径：自动重定向到8082端口的Web应用
      GoRoute(
        path: '/',
        builder: (context, state) => const WebAppPage(),
      ),
    ],
  );
}
