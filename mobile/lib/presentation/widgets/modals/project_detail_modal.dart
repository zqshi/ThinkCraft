import 'package:flutter/material.dart';

import '../../themes/app_colors.dart';

class ProjectDetailModal {
  static Future<void> show(
    BuildContext context, {
    required String title,
    required int memberCount,
    required int ideaCount,
  }) {
    return showDialog(
      context: context,
      barrierDismissible: true,
      builder: (context) => _ProjectDetailDialog(
        title: title,
        memberCount: memberCount,
        ideaCount: ideaCount,
      ),
    );
  }
}

class _ProjectDetailDialog extends StatelessWidget {
  const _ProjectDetailDialog({
    required this.title,
    required this.memberCount,
    required this.ideaCount,
  });

  final String title;
  final int memberCount;
  final int ideaCount;

  @override
  Widget build(BuildContext context) {
    return Dialog(
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 800, maxHeight: 640),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(
                    title,
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
              Wrap(
                spacing: 12,
                runSpacing: 12,
                children: [
                  const _StatCard(label: '状态', value: '进行中'),
                  _StatCard(label: '团队成员', value: '$memberCount'),
                  _StatCard(label: '创意数', value: '$ideaCount'),
                ],
              ),
              const SizedBox(height: 16),
              Text(
                '团队成员',
                style: Theme.of(context)
                    .textTheme
                    .bodyMedium
                    ?.copyWith(fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 8),
              Expanded(
                child: ListView.separated(
                  itemBuilder: (context, index) {
                    return ListTile(
                      leading: const CircleAvatar(child: Text('🤖')),
                      title: Text('成员 ${index + 1}'),
                      subtitle: const Text('产品/设计/研发'),
                      trailing: OutlinedButton(
                        onPressed: () {},
                        child: const Text('移除'),
                      ),
                    );
                  },
                  separatorBuilder: (_, __) => const Divider(height: 1),
                  itemCount: 3,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 160,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.bgSecondary,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: Theme.of(context)
                .textTheme
                .bodySmall
                ?.copyWith(color: AppColors.textSecondary),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: Theme.of(context)
                .textTheme
                .titleMedium
                ?.copyWith(fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }
}
