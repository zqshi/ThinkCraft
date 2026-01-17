import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../modals/settings_modal.dart';
import '../modals/login_modal.dart';
import '../overlays/logout_overlay.dart';
import '../../../application/state/providers.dart';
import '../../themes/app_responsive.dart';
import '../../themes/app_colors.dart';
import '../../themes/app_spacing.dart';
import '../../themes/app_radius.dart';
import '../../themes/app_breakpoints.dart';
import '../../themes/app_animations.dart';
import '../../themes/app_shadows.dart';

/// ThinkCraft 应用外壳
/// 完全对齐Web端布局结构，使用统一的主题系统
/// 集成登录检查和登出逻辑
class AppShell extends ConsumerWidget {
  const AppShell({
    super.key,
    required this.title,
    required this.body,
    this.sidebar,
    this.actions,
    this.bottomBar,
    this.showSettings = true,
    this.onSettings,
  });

  final String title;
  final Widget body;
  final Widget? sidebar;
  final List<Widget>? actions;
  final Widget? bottomBar;
  final bool showSettings;
  final VoidCallback? onSettings;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // 监听登录状态（对齐Web端登录检查）
    final isLoggedIn = ref.watch(isLoggedInProvider);

    // 如果未登录，在下一帧显示LoginModal（防止在build中弹窗）
    if (!isLoggedIn) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (context.mounted) {
          LoginModal.show(context);
        }
      });
    }
    return LayoutBuilder(
      builder: (context, constraints) {
        // 使用AppBreakpoints判断是否为桌面模式（对应Web端768px断点）
        final isDesktop = AppBreakpoints.isDesktopMode(constraints.maxWidth);
        final colorScheme = Theme.of(context).colorScheme;
        final isDark = Theme.of(context).brightness == Brightness.dark;

        // 根据主题模式选择边框颜色
        final borderColor = isDark ? AppColorsDark.border : AppColors.border;

        return Scaffold(
          backgroundColor: colorScheme.surface,
          drawer: (!isDesktop && sidebar != null)
              ? Drawer(child: sidebar!)
              : null,
          body: SafeArea(
            child: Row(
              children: [
                // 桌面端：固定280px侧边栏（对应Web端 .sidebar { width: 280px }）
                if (isDesktop && sidebar != null)
                  SizedBox(width: 280, child: sidebar!),
                Expanded(
                  child: Container(
                    color: isDark ? AppColorsDark.bgPrimary : AppColors.bgPrimary,
                    child: Stack(
                      children: [
                        // 主内容区域
                        Column(
                          children: [
                            // Header（对应Web端 .main-header）
                            Container(
                              padding: EdgeInsets.symmetric(
                                // 响应式padding：移动12/16，平板14/20，桌面16/24
                                horizontal: constraints.maxWidth < 640
                                    ? 16.0
                                    : (constraints.maxWidth <= 1024 ? 20.0 : AppResponsive.getSpacing(context, AppSpacing.lg)),
                                vertical: constraints.maxWidth < 640
                                    ? 12.0
                                    : (constraints.maxWidth <= 1024 ? 14.0 : AppResponsive.getSpacing(context, AppSpacing.md)),
                              ),
                              decoration: BoxDecoration(
                                color: isDark ? AppColorsDark.bgPrimary : AppColors.bgPrimary,
                                border: Border(
                                  bottom: BorderSide(color: borderColor),
                                ),
                              ),
                              child: Row(
                                children: [
                                  // 移动端：汉堡菜单按钮 + 点击动画
                                  if (!isDesktop && sidebar != null)
                                    Builder(
                                      builder: (context) => AnimatedButton(
                                        onTap: () =>
                                            Scaffold.of(context).openDrawer(),
                                        child: IconButton(
                                          icon: const Icon(Icons.menu),
                                          onPressed: () =>
                                              Scaffold.of(context).openDrawer(),
                                          padding: EdgeInsets.zero,
                                          color: isDark
                                              ? AppColorsDark.textSecondary
                                              : AppColors.textSecondary,
                                        ),
                                      ),
                                    ),
                                  Text(
                                    title,
                                    style: Theme.of(context)
                                        .textTheme
                                        .titleMedium
                                        ?.copyWith(fontWeight: FontWeight.w600),
                                  ),
                                  const Spacer(),
                                  ...?actions,
                                  // 设置按钮 + 点击动画
                                  if (showSettings)
                                    AnimatedButton(
                                      onTap: onSettings ??
                                          () => SettingsModal.show(context),
                                      child: IconButton(
                                        icon: const Icon(Icons.settings_outlined),
                                        onPressed: onSettings ??
                                            () => SettingsModal.show(context),
                                        padding: EdgeInsets.zero,
                                        color: isDark
                                            ? AppColorsDark.textSecondary
                                            : AppColors.textSecondary,
                                      ),
                                    ),
                                ],
                              ),
                            ),
                            // 主体内容区
                            Expanded(
                              child: Padding(
                                // 移动端为底部输入框预留空间
                                padding: EdgeInsets.only(
                                  bottom: !isDesktop && bottomBar != null ? 100 : 0,
                                ),
                                child: body,
                              ),
                            ),
                            // 桌面端：底部栏在Column中
                            if (isDesktop && bottomBar != null) bottomBar!,
                          ],
                        ),
                        // 移动端：底部栏固定定位（对应Web端 position: fixed）
                        if (!isDesktop && bottomBar != null)
                          Positioned(
                            left: 0,
                            right: 0,
                            bottom: 0,
                            child: Container(
                              decoration: const BoxDecoration(
                                // P0修复：移动端上阴影，对齐Web端（0 -2px 8px rgba(0, 0, 0, 0.1)）
                                boxShadow: [AppShadows.inputTop],
                              ),
                              child: bottomBar!,
                            ),
                          ),
                        // 登出白色遮罩层（对齐Web端 #logoutOverlay）
                        // 防止敏感信息泄漏，在登出时显示
                        const LogoutOverlay(),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

/// 侧边栏组件
/// 完全对齐Web端侧边栏结构（280px宽度 + 顶部Logo + 新建按钮 + 底部用户信息）
class AppSidebar extends ConsumerWidget {
  const AppSidebar({
    super.key,
    required this.content,
    this.onNewChat,
    this.activeTab = 'chats',
    this.onTeamTap,
  });

  final Widget content;
  final VoidCallback? onNewChat;
  final String activeTab;
  final VoidCallback? onTeamTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    // 根据主题模式选择颜色
    final bgColor = isDark ? AppColorsDark.bgSidebar : AppColors.bgSidebar;
    final borderColor = isDark ? AppColorsDark.border : AppColors.border;

    // 从provider读取当前用户显示名称（对齐Web端动态显示）
    final displayName = ref.watch(currentDisplayNameProvider);

    return Container(
      // P1修复：对齐Web端 .sidebar { border-right: 1px solid var(--border); }
      decoration: BoxDecoration(
        color: bgColor,
        border: Border(
          right: BorderSide(color: borderColor, width: 1),
        ),
      ),
      child: Column(
        children: [
          // 顶部区域：Logo + 新建对话按钮（对应Web端 .sidebar-header）
          Container(
            padding: const EdgeInsets.all(AppSpacing.lg - 4), // 20px
            decoration: BoxDecoration(
              border: Border(
                bottom: BorderSide(color: borderColor),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Logo（对应Web端 .logo { font-size: 20px; font-weight: 700; }）
                Text(
                  'ThinkCraft',
                  style: TextStyle(
                    fontSize: 20, // Web端：20px
                    fontWeight: FontWeight.w700,
                    color: theme.colorScheme.primary,
                  ),
                ),
                const SizedBox(height: AppSpacing.sm + 4), // 12px
                // 新建对话按钮（对应Web端 .new-chat-btn）+ 点击动画
                SizedBox(
                  width: double.infinity,
                  child: AnimatedButton(
                    onTap: onNewChat,
                    child: ElevatedButton.icon(
                      onPressed: onNewChat,
                      icon: const Icon(Icons.add, size: 18),
                      label: const Text('新建对话'),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // 团队Tab切换区（对应Web端 .sidebar-tabs）
          if (onTeamTap != null)
            Container(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.md, // 16px
                AppSpacing.sm + 4, // 12px
                AppSpacing.md,
                0,
              ),
              decoration: BoxDecoration(
                border: Border(
                  bottom: BorderSide(color: borderColor, width: 2),
                ),
              ),
              child: Row(
                children: [
                  _SidebarTab(
                    label: '对话',
                    icon: Icons.chat_bubble_outline,
                    isActive: activeTab == 'chats',
                  ),
                  const SizedBox(width: 6),
                  _SidebarTab(
                    label: '团队',
                    icon: Icons.group_outlined,
                    isActive: activeTab == 'team',
                    onTap: onTeamTap,
                  ),
                ],
              ),
            ),

          // 中间内容区（对话列表/团队列表）
          Expanded(child: content),

          // 底部用户信息区（对应Web端 .sidebar-footer）
          // 对齐Web端：移除设置入口，只显示用户信息
          Container(
            padding: const EdgeInsets.all(AppSpacing.md), // 16px
            decoration: BoxDecoration(
              border: Border(
                top: BorderSide(color: borderColor),
              ),
            ),
            child: Row(
              children: [
                const CircleAvatar(
                  radius: 16,
                  child: Icon(Icons.person, size: 18),
                ),
                const SizedBox(width: AppSpacing.sm), // 8px
                Expanded(
                  child: Text(
                    displayName,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// 侧边栏Tab组件
/// 完全对齐Web端 .sidebar-tab 样式
class _SidebarTab extends StatelessWidget {
  const _SidebarTab({
    required this.label,
    required this.icon,
    required this.isActive,
    this.isDisabled = false,
    this.onTap,
  });

  final String label;
  final IconData icon;
  final bool isActive;
  final bool isDisabled;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final borderColor = isDark ? AppColorsDark.border : AppColors.border;
    final textTertiary = isDark ? AppColorsDark.textTertiary : AppColors.textTertiary;
    final textSecondary = isDark ? AppColorsDark.textSecondary : AppColors.textSecondary;

    final textColor = isDisabled
        ? textTertiary
        : (isActive ? theme.colorScheme.primary : textSecondary);

    return Expanded(
      child: InkWell(
        onTap: isDisabled ? null : onTap,
        hoverColor: theme.colorScheme.primary.withOpacity(0.05), // 对齐Web端 rgba(99,102,241,0.05)
        borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadius.sm)),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            // 使用主题色，对齐Web端 .sidebar-tab.active { background: var(--bg-primary); }
            color: isActive
                ? (isDark ? AppColorsDark.bgPrimary : AppColors.bgPrimary)
                : Colors.transparent,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadius.sm)),
            border: Border.all(
              color: isActive ? borderColor : Colors.transparent,
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(icon, size: 18, color: textColor), // 对齐Web端18px
                  const SizedBox(width: 6),
                  Text(
                    label,
                    style: theme.textTheme.bodySmall?.copyWith(
                          fontWeight:
                              isActive ? FontWeight.w600 : FontWeight.w500,
                          color: textColor,
                        ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              if (isActive)
                Container(
                  height: 2,
                  width: 40,
                  color: theme.colorScheme.primary,
                )
              else
                const SizedBox(height: 2),
            ],
          ),
        ),
      ),
    );
  }
}
