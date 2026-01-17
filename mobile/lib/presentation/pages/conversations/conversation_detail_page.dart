import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../application/state/conversation_state.dart';
import '../../../application/state/providers.dart';
import '../../../application/state/session_state.dart';
import '../../../domain/conversation/models/message.dart';
import '../../widgets/input/multimodal_input_field.dart';
import '../../widgets/layout/app_shell.dart';
import '../../widgets/panels/knowledge_panel.dart';
import '../../themes/app_colors.dart';

class ConversationDetailPage extends ConsumerStatefulWidget {
  const ConversationDetailPage({super.key, required this.conversationId});

  final String conversationId;

  @override
  ConsumerState<ConversationDetailPage> createState() =>
      _ConversationDetailPageState();
}

class _ConversationDetailPageState
    extends ConsumerState<ConversationDetailPage> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  bool _sending = false;
  bool _showKnowledge = false;

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final messagesAsync = ref.watch(conversationMessagesProvider(widget.conversationId));
    final userId = ref.watch(currentUserIdProvider);
    final conversationListAsync = ref.watch(conversationListProvider(userId));
    WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToBottom());

    return AppShell(
      title: 'ThinkCraft AI',
      actions: [
        IconButton(
          icon: const Icon(Icons.menu_book_outlined),
          onPressed: () => setState(() => _showKnowledge = !_showKnowledge),
        ),
      ],
      sidebar: AppSidebar(
        onNewChat: () async {
          final useCase = ref.read(createConversationUseCaseProvider);
          final newConversation = await useCase.execute(
            userId: userId,
            title: '新对话',
          );
          if (context.mounted) {
            context.push('/conversations/${newConversation.id}');
          }
        },
        content: conversationListAsync.when(
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
                final isActive = conversation.id == widget.conversationId;
                return _ChatSidebarItem(
                  title: conversation.title,
                  icon: conversation.isPinned
                      ? Icons.push_pin
                      : Icons.chat_bubble_outline,
                  isActive: isActive,
                  onTap: () => context.push('/conversations/${conversation.id}'),
                );
              },
            );
          },
        ),
      ),
      body: Stack(
        children: [
          Column(
            children: [
              Expanded(
                child: messagesAsync.when(
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (err, _) => const _BodyError(message: '消息加载失败'),
                  data: (messages) {
                    if (messages.isEmpty) {
                      return Center(
                        child: ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 500),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(
                                Icons.lightbulb_outline,
                                size: 64,
                                color: AppColors.textTertiary,
                              ),
                              const SizedBox(height: 16),
                              Text(
                                '苏格拉底式思维引导',
                                textAlign: TextAlign.center,
                                style: Theme.of(context)
                                    .textTheme
                                    .titleLarge
                                    ?.copyWith(
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.textSecondary,
                                    ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                '通过深度提问，帮助你理清创意思路、发现盲点、形成结构化洞察',
                                textAlign: TextAlign.center,
                                style: Theme.of(context)
                                    .textTheme
                                    .bodySmall
                                    ?.copyWith(color: AppColors.textTertiary),
                              ),
                            ],
                          ),
                        ),
                      );
                    }
                    return ListView.builder(
                      padding: const EdgeInsets.fromLTRB(24, 24, 24, 80),
                      controller: _scrollController,
                      itemCount: messages.length,
                      itemBuilder: (context, index) {
                        final message = messages[index];
                        return _MessageItem(message: message);
                      },
                    );
                  },
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                decoration: const BoxDecoration(
                  color: AppColors.bgPrimary,
                  border: Border(
                    top: BorderSide(color: AppColors.border),
                  ),
                ),
                child: Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 800),
                    child: MultimodalInputField(
                      controller: _messageController,
                      hintText: '分享你的创意想法，让我们通过深度对话来探索它的可能性...',
                      onSubmit: (content) async {
                        if (_sending) return;
                        setState(() => _sending = true);
                        try {
                          final useCase =
                              ref.read(sendConversationMessageUseCaseProvider);
                          await useCase.execute(
                            conversationId: widget.conversationId,
                            message: content,
                          );
                          _messageController.clear();
                          ref.invalidate(
                            conversationMessagesProvider(widget.conversationId),
                          );
                        } finally {
                          if (mounted) {
                            setState(() => _sending = false);
                          }
                        }
                      },
                    ),
                  ),
                ),
              ),
            ],
          ),
          if (_showKnowledge)
            KnowledgePanel(onClose: () => setState(() => _showKnowledge = false)),
        ],
      ),
    );
  }

  void _scrollToBottom() {
    if (!_scrollController.hasClients) return;
    _scrollController.animateTo(
      _scrollController.position.maxScrollExtent,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeOut,
    );
  }
}

class _MessageItem extends StatelessWidget {
  const _MessageItem({required this.message});

  final Message message;

  @override
  Widget build(BuildContext context) {
    final isUser = message.role == MessageRole.user;
    final avatarGradient = isUser
        ? const LinearGradient(
            colors: [Color(0xFF667EEA), Color(0xFF764BA2)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          )
        : null;
    final avatarBackground =
        isUser ? null : Theme.of(context).colorScheme.surfaceContainerHighest;
    final textColor = isUser ? AppColors.textPrimary : AppColors.textSecondary;

    return Padding(
      padding: const EdgeInsets.only(bottom: 24),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: avatarGradient,
              color: avatarBackground ?? AppColors.bgSecondary,
            ),
            child: Center(
              child: Text(
                isUser ? '你' : 'AI',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                      color: isUser ? Colors.white : AppColors.primary,
                    ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Flexible(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 680),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        isUser ? '你' : 'ThinkCraft',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              fontWeight: FontWeight.w600,
                              color: AppColors.textPrimary,
                            ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        _formatTime(message.createdAt),
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: AppColors.textTertiary,
                            ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    message.content,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          fontSize: 15,
                          height: 1.6,
                          color: textColor,
                        ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _formatTime(DateTime time) {
    final local = time.toLocal();
    final hour = local.hour.toString().padLeft(2, '0');
    final minute = local.minute.toString().padLeft(2, '0');
    return '$hour:$minute';
  }
}

class _ChatSidebarItem extends StatelessWidget {
  const _ChatSidebarItem({
    required this.title,
    required this.icon,
    required this.isActive,
    this.onTap,
  });

  final String title;
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
