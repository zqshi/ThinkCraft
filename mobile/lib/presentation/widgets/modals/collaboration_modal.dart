import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../application/state/collaboration_state.dart';
import '../../../application/state/session_state.dart';
import '../../themes/app_colors.dart';

class CollaborationModal {
  static Future<void> show(BuildContext context) {
    return showDialog(
      context: context,
      barrierDismissible: true,
      builder: (context) => const _CollaborationDialog(),
    );
  }
}

class _CollaborationDialog extends ConsumerStatefulWidget {
  const _CollaborationDialog();

  @override
  ConsumerState<_CollaborationDialog> createState() =>
      _CollaborationDialogState();
}

class _CollaborationDialogState extends ConsumerState<_CollaborationDialog> {
  String? _selectedPlanId;

  @override
  Widget build(BuildContext context) {
    return Dialog(
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 720, maxHeight: 560),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(
                    '🤝 智能协同编排',
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
              Expanded(child: _buildContent(context)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildContent(BuildContext context) {
    final userId = ref.watch(currentUserIdProvider);
    final plansAsync = ref.watch(collaborationPlansProvider(userId));

    return plansAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (err, _) => Center(child: Text('Failed to load plans: $err')),
      data: (plans) {
        if (plans.isEmpty) {
          return Center(
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.bgSecondary,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.hub_outlined, size: 48),
                  const SizedBox(height: 12),
                  Text(
                    '暂无协同计划',
                    style: Theme.of(context)
                        .textTheme
                        .bodyMedium
                        ?.copyWith(fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    '创建计划后可查看协同编排结果',
                    style: Theme.of(context)
                        .textTheme
                        .bodySmall
                        ?.copyWith(color: AppColors.textSecondary),
                  ),
                ],
              ),
            ),
          );
        }

        final selectedPlanId = _selectedPlanId ?? plans.first.id;
        final selectedPlan =
            plans.firstWhere((plan) => plan.id == selectedPlanId);

        return Row(
          children: [
            SizedBox(
              width: 220,
              child: ListView.separated(
                itemBuilder: (context, index) {
                  final plan = plans[index];
                  final isActive = plan.id == selectedPlanId;
                  return Container(
                    decoration: BoxDecoration(
                      color: isActive ? AppColors.bgPrimary : Colors.transparent,
                      borderRadius: BorderRadius.circular(8),
                      border: isActive
                          ? Border.all(color: AppColors.border)
                          : null,
                    ),
                    child: ListTile(
                      title: Text(
                        plan.goal,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      subtitle: Text('状态 ${plan.status.name}'),
                      onTap: () => setState(() => _selectedPlanId = plan.id),
                    ),
                  );
                },
                separatorBuilder: (_, __) => const Divider(height: 1),
                itemCount: plans.length,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.bgSecondary,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      selectedPlan.goal,
                      style: Theme.of(context)
                          .textTheme
                          .titleSmall
                          ?.copyWith(fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 6),
                    Text('状态 ${selectedPlan.status.name}'),
                    const SizedBox(height: 12),
                    Text(
                    '能力分析/模式生成/执行结果将按计划更新展示。',
                    style: Theme.of(context)
                        .textTheme
                        .bodySmall
                        ?.copyWith(color: AppColors.textSecondary),
                    ),
                    const Spacer(),
                    Align(
                      alignment: Alignment.centerRight,
                      child: ElevatedButton(
                        onPressed: () => Navigator.of(context).pop(),
                        child: const Text('返回'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}
