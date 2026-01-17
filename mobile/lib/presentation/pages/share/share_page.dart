import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../application/state/providers.dart';
import '../../../application/state/session_state.dart';
import '../../../application/state/share_state.dart';
import '../../../domain/share/models/share_link.dart';
import '../../widgets/common/primary_button.dart';
import '../../widgets/common/text_input.dart';
import '../../widgets/layout/app_shell.dart';
import '../../themes/app_colors.dart';

class SharePage extends ConsumerStatefulWidget {
  const SharePage({super.key});

  @override
  ConsumerState<SharePage> createState() => _SharePageState();
}

class _SharePageState extends ConsumerState<SharePage> {
  final TextEditingController _targetController = TextEditingController();
  final TextEditingController _titleController = TextEditingController();
  ShareType _type = ShareType.report;

  @override
  void dispose() {
    _targetController.dispose();
    _titleController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final userId = ref.watch(currentUserIdProvider);
    final sharesAsync = ref.watch(shareListProvider(userId));

    return AppShell(
      title: 'ThinkCraft AI',
      sidebar: AppSidebar(
        content: sharesAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (err, _) => Center(child: Text('Failed to load shares: $err')),
          data: (shares) {
            if (shares.isEmpty) {
              return const Center(child: Text('暂无分享'));
            }
            return ListView.separated(
              padding: const EdgeInsets.all(12),
              itemBuilder: (context, index) {
                final share = shares[index];
                return ListTile(
                  leading: const Icon(Icons.link, size: 18),
                  title: Text(share.title?.isNotEmpty == true
                      ? share.title!
                      : 'Share ${share.id}'),
                  subtitle: Text(share.type.name),
                  onTap: () => context.push('/share/${share.id}'),
                );
              },
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemCount: shares.length,
            );
          },
        ),
      ),
      body: sharesAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Failed to load shares: $err')),
        data: (shares) {
          return ListView(
            padding: const EdgeInsets.all(24),
            children: [
              _SectionCard(
                child: Column(
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: TextInput(
                            controller: _targetController,
                            label: '目标ID',
                          ),
                        ),
                        const SizedBox(width: 8),
                        DropdownButton<ShareType>(
                          value: _type,
                          onChanged: (value) {
                            if (value == null) return;
                            setState(() => _type = value);
                          },
                          items: ShareType.values
                              .map((type) => DropdownMenuItem(
                                    value: type,
                                    child: Text(type.name),
                                  ))
                              .toList(),
                        ),
                        const SizedBox(width: 8),
                        PrimaryButton(
                          label: '创建',
                          onPressed: () async {
                            final targetId = _targetController.text.trim();
                            if (targetId.isEmpty) return;
                            final useCase = ref.read(createShareUseCaseProvider);
                            await useCase.execute(
                              userId: userId,
                              type: _type,
                              data: {'targetId': targetId},
                              title: _titleController.text.trim().isEmpty
                                  ? null
                                  : _titleController.text.trim(),
                            );
                            _targetController.clear();
                            _titleController.clear();
                            ref.invalidate(shareListProvider(userId));
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    TextInput(
                      controller: _titleController,
                      label: '标题（可选）',
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Text(
                '分享列表',
                style: Theme.of(context)
                    .textTheme
                    .titleSmall
                    ?.copyWith(fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 8),
              if (shares.isEmpty)
                const Center(child: Text('暂无分享。'))
              else
                ...shares.map((share) {
                  return _ListCard(
                    child: ListTile(
                      title: Text(share.title?.isNotEmpty == true
                          ? share.title!
                          : 'Share ${share.id}'),
                      subtitle: Text(share.type.name),
                      onTap: () => context.push('/share/${share.id}'),
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
  const _ListCard({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: child,
    );
  }
}
