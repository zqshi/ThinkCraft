import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../application/state/providers.dart';

/// 登出白色遮罩层
/// 对齐Web端 #logoutOverlay 功能：防止敏感信息泄漏
/// 在登出时显示纯白遮罩，直到登录Modal显示
class LogoutOverlay extends ConsumerWidget {
  const LogoutOverlay({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // 监听登出遮罩显示状态
    final visible = ref.watch(showLogoutOverlayProvider);

    if (!visible) return const SizedBox.shrink();

    return Positioned.fill(
      child: Container(
        color: Colors.white, // 纯白遮罩
        child: const Center(
          child: CircularProgressIndicator(), // 可选：显示loading指示器
        ),
      ),
    );
  }
}
