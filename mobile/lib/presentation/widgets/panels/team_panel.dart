import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../application/state/conversation_state.dart';
import '../../../application/state/session_state.dart';
import '../modals/project_detail_modal.dart';
import '../../themes/app_colors.dart';

class TeamPanel extends ConsumerWidget {
  const TeamPanel({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final userId = ref.watch(currentUserIdProvider);
    final conversationsAsync = ref.watch(conversationListProvider(userId));

    return Dialog(
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 820, maxHeight: 640),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(
                    '团队空间',
                    style: Theme.of(context)
                        .textTheme
                        .titleMedium
                        ?.copyWith(fontWeight: FontWeight.w600),
                  ),
                  const Spacer(),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              const Divider(height: 1, color: AppColors.border),
              const SizedBox(height: 12),
              Row(
                children: [
                  ElevatedButton.icon(
                    onPressed: () {},
                    icon: const Icon(Icons.add, size: 18),
                    label: const Text('新建项目'),
                  ),
                  const SizedBox(width: 8),
                  OutlinedButton(
                    onPressed: () {},
                    child: const Text('邀请成员'),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Expanded(
                child: conversationsAsync.when(
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (err, _) =>
                      Center(child: Text('Failed to load projects: $err')),
                  data: (conversations) {
                    if (conversations.isEmpty) {
                      return const Center(child: Text('暂无项目'));
                    }
                    return ListView.separated(
                      itemBuilder: (context, index) {
                        final conversation = conversations[index];
                        const memberCount = 3;
                        final ideaCount = conversation.messages.length;
                        return InkWell(
                          borderRadius: BorderRadius.circular(8),
                          onTap: () => ProjectDetailModal.show(
                            context,
                            title: conversation.title,
                            memberCount: memberCount,
                            ideaCount: ideaCount,
                          ),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 10,
                            ),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: AppColors.border),
                              color: AppColors.bgSecondary,
                            ),
                            child: Row(
                              children: [
                                const Text('📦', style: TextStyle(fontSize: 20)),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        conversation.title,
                                        style: Theme.of(context)
                                            .textTheme
                                            .bodyMedium
                                            ?.copyWith(
                                              fontWeight: FontWeight.w600,
                                            ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        '进行中 · 成员 $memberCount · 创意 $ideaCount',
                                        style: Theme.of(context)
                                            .textTheme
                                            .bodySmall
                                            ?.copyWith(
                                              color: AppColors.textSecondary,
                                            ),
                                      ),
                                    ],
                                  ),
                                ),
                                const Icon(Icons.chevron_right, size: 18),
                              ],
                            ),
                          ),
                        );
                      },
                      separatorBuilder: (_, __) => const Divider(height: 1),
                      itemCount: conversations.length,
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
