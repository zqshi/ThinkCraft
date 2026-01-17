import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../themes/app_colors.dart';
import '../../themes/app_spacing.dart';
import '../../themes/app_radius.dart';
import '../../widgets/input/multimodal_input_field.dart';
import '../../widgets/layout/app_shell.dart';
import '../../widgets/common/long_press_menu.dart';
import '../../../application/state/providers.dart';
import '../../../application/state/session_state.dart';
import '../../../application/state/conversation_state.dart';

/// ThinkCraft 主页
/// 完全对齐Web端首页样式
class HomePage extends ConsumerStatefulWidget {
  const HomePage({super.key});

  @override
  ConsumerState<HomePage> createState() => _HomePageState();
}

class _HomePageState extends ConsumerState<HomePage> {
  final TextEditingController _controller = TextEditingController();
  String _activeTab = 'chats'; // 当前激活的Tab：'chats' 或 'team'
  bool _isCreatingChat = false; // 新建对话loading状态

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  /// 创建新对话并跳转（对齐Web端逻辑）
  Future<void> _createAndNavigateToChat({String? initialMessage}) async {
    if (_isCreatingChat) return;

    setState(() {
      _isCreatingChat = true;
    });

    try {
      final userId = ref.read(currentUserIdProvider);
      final useCase = ref.read(createConversationUseCaseProvider);

      // 创建新对话
      final conversation = await useCase.execute(
        userId: userId,
        title: initialMessage?.isNotEmpty == true
            ? initialMessage!.substring(0, initialMessage.length > 20 ? 20 : initialMessage.length)
            : '新对话',
      );

      if (mounted) {
        // 清空输入框
        _controller.clear();

        // 刷新对话列表
        ref.invalidate(conversationListProvider(userId));

        // 跳转到对话详情页
        context.push('/conversations/${conversation.id}');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('创建对话失败: $e'),
            backgroundColor: const Color(0xFFEF4444),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isCreatingChat = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final userId = ref.watch(currentUserIdProvider);
    final conversationsAsync = ref.watch(conversationListProvider(userId));
    // 读取团队功能开关状态
    final enableTeam = ref.watch(appStateProvider.select((s) => s.settings.enableTeam));

    // 监听enableTeam变化，如果关闭且当前在team tab，切回chats
    ref.listen<bool>(
      appStateProvider.select((s) => s.settings.enableTeam),
      (previous, next) {
        if (previous == true && next == false && _activeTab == 'team') {
          setState(() {
            _activeTab = 'chats';
          });
        }
      },
    );

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final borderColor = isDark ? AppColorsDark.border : AppColors.border;
    final bgPrimary = isDark ? AppColorsDark.bgPrimary : AppColors.bgPrimary;

    // 获取当前路由路径，用于判断active状态
    final currentPath = GoRouterState.of(context).uri.path;

    return AppShell(
      title: 'ThinkCraft AI',
      sidebar: AppSidebar(
        activeTab: _activeTab,
        // 如果enableTeam为true，提供onTeamTap回调
        onTeamTap: enableTeam
            ? () {
                setState(() {
                  _activeTab = _activeTab == 'chats' ? 'team' : 'chats';
                });
              }
            : null,
        onNewChat: _isCreatingChat ? null : () => _createAndNavigateToChat(),
        // 根据activeTab显示不同内容
        content: _activeTab == 'chats'
            ? conversationsAsync.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (err, _) =>
                    Center(child: Text('Failed to load conversations: $err')),
                data: (conversations) {
                  if (conversations.isEmpty) {
                    return const Center(child: Text('暂无对话'));
                  }
                  return ListView.builder(
                    padding: const EdgeInsets.all(AppSpacing.sm + 4), // 12px
                    itemCount: conversations.length,
                    itemBuilder: (context, index) {
                      final conversation = conversations[index];
                      final isActive =
                          currentPath == '/conversations/${conversation.id}';
                      return _ChatSidebarItem(
                        title: conversation.title,
                        icon: conversation.isPinned
                            ? Icons.push_pin
                            : Icons.chat_bubble_outline,
                        isActive: isActive,
                        isPinned: conversation.isPinned,
                        tags: conversation.tags,
                        conversationId: conversation.id,
                        onTap: () =>
                            context.push('/conversations/${conversation.id}'),
                        onLongPress: null, // TODO: 实现长按菜单功能
                      );
                    },
                  );
                },
              )
            : Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.group_outlined,
                      size: 64,
                      color: isDark ? AppColorsDark.textTertiary : AppColors.textTertiary,
                    ),
                    const SizedBox(height: AppSpacing.md),
                    Text(
                      '团队协作功能',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                        color: isDark ? AppColorsDark.textSecondary : AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Text(
                      '启用后可在此管理项目团队',
                      style: TextStyle(
                        fontSize: 14,
                        color: isDark ? AppColorsDark.textTertiary : AppColors.textTertiary,
                      ),
                    ),
                  ],
                ),
              ),
      ),
      body: Container(
        color: bgPrimary,
        child: const _EmptyState(
          title: '苏格拉底式思维引导',
          subtitle: '通过深度提问，帮助你理清创意思路、发现盲点、形成结构化洞察',
        ),
      ),
      bottomBar: _activeTab == 'team'
          ? null // 对齐Web端：团队Tab不显示输入框
          : Container(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.lg, // 24px
                vertical: AppSpacing.lg - 4, // 20px
              ),
              decoration: BoxDecoration(
                color: bgPrimary,
                border: Border(
                  top: BorderSide(color: borderColor),
                ),
              ),
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 800),
                  child: MultimodalInputField(
                    controller: _controller,
                    onSubmit: (message) {
                      if (_isCreatingChat || message.trim().isEmpty) return;
                      _createAndNavigateToChat(initialMessage: message);
                    },
                    hintText: '分享你的创意想法，让我们通过深度对话来探索它的可能性...',
                  ),
                ),
              ),
            ),
    );
  }
}

/// 空状态
/// 完全对齐Web端全屏居中布局（无卡片）
class _EmptyState extends StatelessWidget {
  const _EmptyState({
    required this.title,
    required this.subtitle,
  });

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;
    final textSecondary = isDark ? AppColorsDark.textSecondary : AppColors.textSecondary;
    final textTertiary = isDark ? AppColorsDark.textTertiary : AppColors.textTertiary;

    // 对齐Web端 .empty-state 样式：absolute全屏居中
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // 灯泡图标：对齐Web端 .empty-icon (64px)
          Icon(
            Icons.lightbulb_outline,
            size: 64, // Web端：64px
            color: colorScheme.primary.withOpacity(0.5), // opacity: 0.5
          ),
          const SizedBox(height: AppSpacing.md), // 16px
          // 标题：对齐Web端 .empty-title (24px)
          Text(
            title,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 24, // Web端：24px
              fontWeight: FontWeight.w600,
              color: textSecondary,
            ),
          ),
          const SizedBox(height: AppSpacing.sm), // 8px
          // 副标题：对齐Web端 .empty-subtitle (14px)
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 400),
            child: Text(
              subtitle,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                color: textTertiary,
                height: 1.5,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// 侧边栏对话项
/// 完全对齐Web端 .chat-item 样式（包括 hover、active、pinned 状态）
/// Chat侧边栏列表项 - 带动画效果
/// 完全对齐Web端动画：transition: all 0.2s ease + transform: translateX(2px) on hover
class _ChatSidebarItem extends StatefulWidget {
  const _ChatSidebarItem({
    required this.title,
    required this.icon,
    this.isActive = false,
    this.isPinned = false,
    this.tags = const [],
    this.conversationId,
    this.onTap,
    this.onLongPress,
  });

  final String title;
  final IconData icon;
  final bool isActive;
  final bool isPinned;
  final List<String> tags;
  final String? conversationId;
  final VoidCallback? onTap;
  final Function(Offset position)? onLongPress;

  @override
  State<_ChatSidebarItem> createState() => _ChatSidebarItemState();
}

class _ChatSidebarItemState extends State<_ChatSidebarItem> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final textSecondary = isDark ? AppColorsDark.textSecondary : AppColors.textSecondary;
    final primary = theme.colorScheme.primary;

    // 对齐Web端的颜色值
    Color? backgroundColor;
    Color textColor = textSecondary;
    FontWeight fontWeight = FontWeight.normal;
    double leftPadding = AppSpacing.sm + 4; // 12px

    if (widget.isPinned) {
      // Web端: .chat-item.pinned { background: rgba(99, 102, 241, 0.08); border-left: 3px solid var(--primary); padding-left: 9px; }
      backgroundColor = const Color(0x146366F1); // rgba(99, 102, 241, 0.08)
      fontWeight = FontWeight.w600;
      leftPadding = 9; // 3px border + 9px padding = 12px total
    } else if (widget.isActive) {
      // Web端: .chat-item.active { background: rgba(99, 102, 241, 0.15); color: var(--primary); font-weight: 500; }
      backgroundColor = const Color(0x266366F1); // rgba(99, 102, 241, 0.15)
      textColor = primary;
      fontWeight = FontWeight.w500;
    }

    // Hover状态背景色（非active/pinned时）
    if (_isHovered && !widget.isActive && !widget.isPinned) {
      backgroundColor = const Color(0x1A6366F1); // rgba(99, 102, 241, 0.1)
    }

    return MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      child: GestureDetector(
        onTap: widget.onTap,
        onLongPressStart: widget.onLongPress != null
            ? (details) => widget.onLongPress!(details.globalPosition)
            : null,
        child: AnimatedContainer(
          // P0修复：对齐Web端 transition: all 0.2s ease
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
          // P0修复：对齐Web端 transform: translateX(2px) on hover（非active状态时）
          transform: _isHovered && !widget.isActive
              ? (Matrix4.identity()..translate(2.0, 0, 0))
              : Matrix4.identity(),
          padding: EdgeInsets.only(
            left: leftPadding,
            right: AppSpacing.sm + 4, // 12px
            top: AppSpacing.sm + 4, // 12px
            bottom: AppSpacing.sm + 4, // 12px
          ),
          margin: const EdgeInsets.only(bottom: AppSpacing.xs), // 4px
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppRadius.sm),
            color: backgroundColor,
            // Pinned状态的左边框
            border: widget.isPinned
                ? Border(left: BorderSide(color: primary, width: 3))
                : null,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 标签区域 - 对齐Web端 .chat-item-tags
              if (widget.tags.isNotEmpty) ...[
                Padding(
                  padding: const EdgeInsets.only(left: 30, bottom: 6), // 对齐Web端样式
                  child: Wrap(
                    spacing: 6, // gap: 6px
                    runSpacing: 4,
                    children: widget.tags.map((tag) {
                      // 判断是否为AI生成标签（包含特定关键词）
                      final isAutoTag = tag.toLowerCase().contains('ai') ||
                                       tag.toLowerCase().contains('自动');

                      return Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: isAutoTag
                              ? const Color(0xFF3B82F6) // AI标签蓝色
                              : const Color(0xFF9CA3AF), // 用户标签灰色
                            width: 1,
                          ),
                          color: isAutoTag
                            ? const Color(0xFFEFF6FF) // AI标签背景色
                            : const Color(0xFFF9FAFB), // 用户标签背景色
                        ),
                        child: Text(
                          tag,
                          style: TextStyle(
                            fontSize: 11, // 对齐Web端 .tag { font-size: 11px; }
                            color: isAutoTag
                              ? const Color(0xFF1D4ED8) // AI标签文字色
                              : const Color(0xFF4B5563), // 用户标签文字色
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ],
              // 主要内容行
              Row(
                children: [
                  // 对应Web端 .chat-item-icon { width: 20px; height: 20px; opacity: 0.6; }
                  Opacity(
                    opacity: 0.6,
                    child: Icon(widget.icon, size: 20, color: textColor),
                  ),
                  const SizedBox(width: 10), // gap: 10px
                  // 对应Web端 .chat-item-content
                  Expanded(
                    child: Text(
                      widget.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        // 对齐Web端 .chat-item { font-size: 14px; }
                        fontSize: 14,
                        color: textColor,
                        fontWeight: fontWeight,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// 显示对话长按菜单
  void _showConversationMenu(
    BuildContext context,
    conversation,
    Offset position,
  ) {
    showLongPressMenu(
      context: context,
      position: position,
      items: [
        LongPressMenuItem(
          label: conversation.isPinned ? '取消固定' : '固定对话',
          icon: conversation.isPinned ? Icons.push_pin_outlined : Icons.push_pin,
          onTap: () {
            // TODO: 实现固定/取消固定功能
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('${conversation.isPinned ? '取消固定' : '固定'}功能开发中')),
            );
          },
        ),
        LongPressMenuItem(
          label: '重命名',
          icon: Icons.edit_outlined,
          onTap: () {
            // TODO: 实现重命名功能
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('重命名功能开发中')),
            );
          },
        ),
        LongPressMenuItem(
          label: '删除',
          icon: Icons.delete_outline,
          isDangerous: true,
          onTap: () {
            // TODO: 实现删除功能
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('删除功能开发中')),
            );
          },
        ),
      ],
    );
  }
}
