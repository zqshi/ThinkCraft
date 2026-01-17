import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../application/state/conversation_state.dart';
import '../../../application/state/providers.dart';
import '../../../application/state/session_state.dart';
import '../../widgets/common/primary_button.dart';
import '../../widgets/common/text_input.dart';
import '../../widgets/common/empty_state.dart';
import 'conversation_refresh_button.dart';
import '../../widgets/layout/app_shell.dart';
import '../../widgets/modals/settings_modal.dart';
import '../../widgets/panels/team_panel.dart';
import '../../themes/app_colors.dart';

class ConversationPage extends ConsumerStatefulWidget {
  const ConversationPage({super.key});

  @override
  ConsumerState<ConversationPage> createState() => _ConversationPageState();
}

class _ConversationPageState extends ConsumerState<ConversationPage> {
  final TextEditingController _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Login modal is optional; keep the page visible by default.

    final userId = ref.watch(currentUserIdProvider);
    final conversationsAsync = ref.watch(conversationListProvider(userId));

    return AppShell(
      title: 'ThinkCraft AI',
      actions: [ConversationRefreshButton(userId: userId)],
      onSettings: () => SettingsModal.show(context),
      sidebar: AppSidebar(
        onNewChat: () async {
          final title = _controller.text.trim();
          if (title.isEmpty) return;
          final useCase = ref.read(createConversationUseCaseProvider);
          await useCase.execute(userId: userId, title: title);
          _controller.clear();
          ref.invalidate(conversationListProvider(userId));
        },
        onTeamTap: () => showDialog(
          context: context,
          builder: (_) => const TeamPanel(),
        ),
        content: conversationsAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (err, _) => const _SidebarError(message: '对话加载失败'),
          data: (conversations) {
            if (conversations.isEmpty) {
              return const Center(child: Text('暂无对话'));
            }
            return ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: conversations.length,
              itemBuilder: (context, index) {
                final conversation = conversations[index];
                return _ChatSidebarItem(
                  title: conversation.title,
                  subtitle: '消息数 ${conversation.messages.length}',
                  icon: conversation.isPinned
                      ? Icons.push_pin
                      : Icons.chat_bubble_outline,
                  isActive: false,
                  onTap: () => context.push('/conversations/${conversation.id}'),
                );
              },
            );
          },
        ),
      ),
      body: conversationsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => const _BodyError(message: '对话加载失败'),
        data: (conversations) {
          return ListView(
            padding: const EdgeInsets.all(24),
            children: [
              _SectionCard(
                child: Row(
                  children: [
                    Expanded(
                      child: TextInput(
                        controller: _controller,
                        label: '输入对话标题',
                      ),
                    ),
                    const SizedBox(width: 8),
                    PrimaryButton(
                      label: '新建',
                      onPressed: () async {
                        final title = _controller.text.trim();
                        if (title.isEmpty) return;
                        final useCase =
                            ref.read(createConversationUseCaseProvider);
                        await useCase.execute(userId: userId, title: title);
                        _controller.clear();
                        ref.invalidate(conversationListProvider(userId));
                      },
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Text(
                '对话列表',
                style: Theme.of(context)
                    .textTheme
                    .titleSmall
                    ?.copyWith(fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 8),
              if (conversations.isEmpty)
                const EmptyState(
                  title: '暂无对话',
                  subtitle: '创建一个对话开始思维引导。',
                )
              else
                ...conversations.map((conversation) {
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: _ListCard(
                      onTap: () => context.push(
                        '/conversations/${conversation.id}',
                      ),
                      child: Row(
                        children: [
                          Icon(
                            conversation.isPinned
                                ? Icons.push_pin
                                : Icons.chat_bubble_outline,
                            size: 18,
                            color: Theme.of(context).colorScheme.primary,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  conversation.title,
                                  style: Theme.of(context)
                                      .textTheme
                                      .bodyLarge
                                      ?.copyWith(fontWeight: FontWeight.w600),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  '消息数 ${conversation.messages.length}',
                                  style: Theme.of(context)
                                      .textTheme
                                      .bodySmall
                                      ?.copyWith(color: AppColors.textSecondary),
                                ),
                              ],
                            ),
                          ),
                          const Icon(Icons.chevron_right, size: 18),
                        ],
                      ),
                    ),
                  );
                }),
            ],
          );
        },
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: child,
    );
  }
}

class _ListCard extends StatelessWidget {
  const _ListCard({required this.child, this.onTap});

  final Widget child;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Theme.of(context).colorScheme.surface,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.border),
          ),
          child: child,
        ),
      ),
    );
  }
}

class _ChatSidebarItem extends StatelessWidget {
  const _ChatSidebarItem({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.isActive,
    this.onTap,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final bool isActive;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final background =
        isActive ? AppColors.primary.withOpacity(0.15) : Colors.transparent;
    final titleColor = isActive ? AppColors.primary : AppColors.textSecondary;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        hoverColor: AppColors.primary.withOpacity(0.1),
        child: Container(
          padding: const EdgeInsets.all(12),
          margin: const EdgeInsets.only(bottom: 4),
          decoration: BoxDecoration(
            color: background,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            children: [
              Icon(icon, size: 20, color: titleColor.withOpacity(0.6)),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        fontSize: 14,
                        color: titleColor,
                        fontWeight: isActive ? FontWeight.w600 : FontWeight.w500,
                      ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SidebarError extends StatelessWidget {
  const _SidebarError({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(12),
      child: Text(
        message,
        textAlign: TextAlign.center,
        style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: AppColors.textTertiary,
            ),
      ),
    );
  }
}

class _BodyError extends StatelessWidget {
  const _BodyError({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Text(
        message,
        style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: AppColors.textTertiary,
            ),
      ),
    );
  }
}
