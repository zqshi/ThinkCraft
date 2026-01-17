import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../themes/app_colors.dart';
import '../../themes/app_spacing.dart';
import '../../themes/app_radius.dart';
import '../../../application/state/providers.dart';

/// 设置弹窗
/// 完全对齐Web端设置弹窗结构和样式
class SettingsModal {
  static Future<void> show(BuildContext context) {
    return showDialog(
      context: context,
      barrierDismissible: true,
      builder: (context) => const _SettingsDialog(),
    );
  }
}

class _SettingsDialog extends ConsumerWidget {
  const _SettingsDialog();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final bgPrimary = isDark ? AppColorsDark.bgPrimary : AppColors.bgPrimary;
    final borderColor = isDark ? AppColorsDark.border : AppColors.border;

    // 从provider读取设置（对齐Web端state.settings）
    final settings = ref.watch(appStateProvider.select((s) => s.settings));
    final notifier = ref.read(appStateProvider.notifier);

    // 对齐Web端 .modal-content { max-width: 600px; }
    return Dialog(
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.md), // 12px
      ),
      backgroundColor: bgPrimary,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 600),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Modal Header（对应Web端 .modal-header）
            Container(
              padding: const EdgeInsets.all(AppSpacing.lg), // 24px
              decoration: BoxDecoration(
                border: Border(bottom: BorderSide(color: borderColor)),
              ),
              child: Row(
                children: [
                  // Modal Title
                  Text(
                    '设置',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const Spacer(),
                  // Close Button（对应Web端 .close-btn）
                  SizedBox(
                    width: 36,
                    height: 36,
                    child: IconButton(
                      onPressed: () => Navigator.of(context).pop(),
                      icon: const Icon(Icons.close, size: 20),
                      padding: EdgeInsets.zero,
                      color: isDark
                          ? AppColorsDark.textSecondary
                          : AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),

            // Modal Body（对应Web端 .modal-body）
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(AppSpacing.lg), // 24px
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // 外观部分
                    _SettingsSection(
                      title: '外观',
                      children: [
                        _SettingToggleItem(
                          title: '暗色模式',
                          subtitle: '切换为深色主题',
                          value: settings.darkMode,
                          onChanged: (value) async {
                            await notifier.toggleDarkMode(value);
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(value ? '已切换到暗色模式' : '已切换到亮色模式'),
                                  duration: const Duration(seconds: 1),
                                ),
                              );
                            }
                          },
                        ),
                      ],
                    ),

                    // 数据管理部分
                    _SettingsSection(
                      title: '数据管理',
                      children: [
                        _SettingToggleItem(
                          title: '保存历史记录',
                          subtitle: '自动保存对话到本地',
                          value: settings.saveHistory,
                          onChanged: (value) async {
                            await notifier.toggleSaveHistory(value);
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(value ? '已开启历史记录保存' : '已关闭历史记录保存'),
                                  duration: const Duration(seconds: 1),
                                ),
                              );
                            }
                          },
                        ),
                      ],
                    ),

                    // 功能部分
                    _SettingsSection(
                      title: '功能',
                      children: [
                        _SettingToggleItem(
                          title: '数字员工团队',
                          subtitle: '启用AI团队协作功能，可在侧边栏切换查看',
                          value: settings.enableTeam,
                          onChanged: (value) async {
                            await notifier.toggleEnableTeam(value);
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(value ? '已开启团队功能' : '已关闭团队功能'),
                                  duration: const Duration(seconds: 1),
                                ),
                              );
                            }
                          },
                        ),
                      ],
                    ),

                    // 操作按钮区（对齐Web端最后一个section：清除历史 + 退出登录）
                    const SizedBox(height: AppSpacing.md), // 间距
                    // 清除所有历史记录按钮
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () async {
                          // 弹出确认对话框
                          final confirmed = await showDialog<bool>(
                            context: context,
                            builder: (context) => AlertDialog(
                              title: const Text('确认清除'),
                              content: const Text('确定要清除所有历史记录吗？此操作无法撤销。'),
                              actions: [
                                TextButton(
                                  onPressed: () => Navigator.pop(context, false),
                                  child: const Text('取消'),
                                ),
                                TextButton(
                                  onPressed: () => Navigator.pop(context, true),
                                  style: TextButton.styleFrom(
                                    foregroundColor: Colors.red,
                                  ),
                                  child: const Text('确认'),
                                ),
                              ],
                            ),
                          );

                          if (confirmed == true && context.mounted) {
                            await notifier.clearAllHistory();
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('历史记录已清除'),
                                  duration: Duration(seconds: 2),
                                ),
                              );
                            }
                          }
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFEF4444), // #ef4444
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(
                            horizontal: AppSpacing.lg, // 24px
                            vertical: AppSpacing.sm + 4, // 12px
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(AppRadius.sm), // 8px
                          ),
                        ).copyWith(
                          // Hover效果
                          backgroundColor: WidgetStateProperty.resolveWith((states) {
                            if (states.contains(WidgetState.hovered)) {
                              return const Color(0xFFDC2626); // #dc2626
                            }
                            return const Color(0xFFEF4444);
                          }),
                        ),
                        child: const Text(
                          '清除所有历史记录',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),

                    const SizedBox(height: AppSpacing.sm + 4), // 12px
                    // 退出登录按钮
                    SizedBox(
                      width: double.infinity,
                      child: TextButton.icon(
                        onPressed: () async {
                          Navigator.of(context).pop(); // 先关闭设置Modal

                          final confirmed = await showDialog<bool>(
                            context: context,
                            builder: (context) => AlertDialog(
                              title: const Text('确认退出'),
                              content: const Text('确定要退出登录吗？'),
                              actions: [
                                TextButton(
                                  onPressed: () => Navigator.pop(context, false),
                                  child: const Text('取消'),
                                ),
                                TextButton(
                                  onPressed: () => Navigator.pop(context, true),
                                  style: TextButton.styleFrom(
                                    foregroundColor: Colors.red,
                                  ),
                                  child: const Text('退出'),
                                ),
                              ],
                            ),
                          );

                          if (confirmed == true && context.mounted) {
                            await notifier.logout();
                            // 登出后会自动触发LoginModal显示（在AppShell中处理）
                          }
                        },
                        icon: const Icon(Icons.logout, color: Colors.red),
                        label: const Text(
                          '退出登录',
                          style: TextStyle(color: Colors.red),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// 设置部分组件（对应Web端 .settings-section）
class _SettingsSection extends StatelessWidget {
  const _SettingsSection({
    required this.title,
    required this.children,
  });

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final textPrimary = isDark ? AppColorsDark.textPrimary : AppColors.textPrimary;

    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.lg), // 24px
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 对应Web端 .settings-section-title { font-size: 16px; margin-bottom: 12px; }
          Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.sm + 4), // 12px
            child: Text(
              title,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: textPrimary,
              ),
            ),
          ),
          ...children,
        ],
      ),
    );
  }
}

/// 设置项（带Toggle开关）
/// 完全对齐Web端 .settings-item + .toggle-switch
class _SettingToggleItem extends StatelessWidget {
  const _SettingToggleItem({
    required this.title,
    required this.subtitle,
    required this.value,
    required this.onChanged,
  });

  final String title;
  final String subtitle;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final bgSecondary = isDark ? AppColorsDark.bgSecondary : AppColors.bgSecondary;
    final textPrimary = isDark ? AppColorsDark.textPrimary : AppColors.textPrimary;
    final textSecondary = isDark ? AppColorsDark.textSecondary : AppColors.textSecondary;

    // 对应Web端 .settings-item { padding: 16px; background: var(--bg-secondary); border-radius: 12px; margin-bottom: 8px; }
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md), // 16px
      margin: const EdgeInsets.only(bottom: AppSpacing.sm), // 8px
      decoration: BoxDecoration(
        color: bgSecondary,
        borderRadius: BorderRadius.circular(AppRadius.md), // 12px
      ),
      child: Row(
        children: [
          // Settings Item Info（对应Web端 .settings-item-info）
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 13,
                    color: textSecondary,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: AppSpacing.md), // 16px
          // Toggle Switch（对应Web端 .toggle-switch）
          _CustomToggleSwitch(
            value: value,
            onChanged: onChanged,
          ),
        ],
      ),
    );
  }
}

/// 自定义Toggle开关组件
/// 完全对齐Web端 .toggle-switch 样式
class _CustomToggleSwitch extends StatelessWidget {
  const _CustomToggleSwitch({
    required this.value,
    required this.onChanged,
  });

  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final borderColor = isDark ? AppColorsDark.border : AppColors.border;

    return GestureDetector(
      onTap: () => onChanged(!value),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
        width: 48, // 对应Web端 width: 48px
        height: 28, // 对应Web端 height: 28px
        decoration: BoxDecoration(
          // 对应Web端 background: var(--primary) 或 var(--border)
          color: value ? AppColors.primary : borderColor,
          borderRadius: BorderRadius.circular(28), // border-radius: 28px
        ),
        padding: const EdgeInsets.all(4),
        child: AnimatedAlign(
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeInOut,
          alignment: value ? Alignment.centerRight : Alignment.centerLeft,
          child: Container(
            width: 20, // 对应Web端 width: 20px
            height: 20, // 对应Web端 height: 20px
            decoration: const BoxDecoration(
              color: Colors.white, // background: white
              shape: BoxShape.circle, // border-radius: 50%
            ),
          ),
        ),
      ),
    );
  }
}
