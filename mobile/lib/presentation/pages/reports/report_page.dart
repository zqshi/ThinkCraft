import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../application/state/providers.dart';
import '../../../application/state/report_state.dart';
import '../../../application/state/session_state.dart';
import '../../../domain/report/models/report.dart';
import '../../widgets/common/primary_button.dart';
import '../../widgets/common/text_input.dart';
import '../../widgets/common/empty_state.dart';
import '../../widgets/layout/app_shell.dart';
import '../../themes/app_colors.dart';

class ReportPage extends ConsumerStatefulWidget {
  const ReportPage({super.key});

  @override
  ConsumerState<ReportPage> createState() => _ReportPageState();
}

class _ReportPageState extends ConsumerState<ReportPage> {
  final TextEditingController _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final userId = ref.watch(currentUserIdProvider);
    final reportsAsync = ref.watch(reportListProvider(userId));

    return AppShell(
      title: 'ThinkCraft AI',
      sidebar: AppSidebar(
        content: reportsAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (err, _) => Center(child: Text('Failed to load reports: $err')),
          data: (reports) {
            if (reports.isEmpty) {
              return const Center(child: Text('暂无报告'));
            }
            return ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: reports.length,
              itemBuilder: (context, index) {
                final report = reports[index];
                return _SidebarReportItem(
                  title: '报告 ${report.id}',
                  subtitle: '对话 ${report.conversationId}',
                  isActive: false,
                  onTap: () => context.push('/reports/${report.id}'),
                );
              },
            );
          },
        ),
      ),
      body: reportsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Failed to load reports: $err')),
        data: (reports) {
          return ListView(
            padding: const EdgeInsets.all(24),
            children: [
              _SectionCard(
                child: Row(
                  children: [
                    Expanded(
                      child: TextInput(
                        controller: _controller,
                        label: '输入对话ID',
                      ),
                    ),
                    const SizedBox(width: 8),
                    PrimaryButton(
                      label: '生成',
                      onPressed: () async {
                        final conversationId = _controller.text.trim();
                        if (conversationId.isEmpty) return;
                        final useCase = ref.read(generateReportUseCaseProvider);
                        await useCase.execute(
                          conversationId: conversationId,
                          userId: userId,
                        );
                        _controller.clear();
                        ref.invalidate(reportListProvider(userId));
                      },
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Text(
                '报告列表',
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 8),
              if (reports.isEmpty)
                const EmptyState(
                  title: '暂无报告',
                  subtitle: '从对话生成报告后会出现在这里。',
                )
              else
                ...reports.map((report) {
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: _ListCard(
                      onTap: () => context.push('/reports/${report.id}'),
                      child: Row(
                        children: [
                          Icon(
                            Icons.description_outlined,
                            size: 18,
                            color: Theme.of(context).colorScheme.primary,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  '报告 ${report.id}',
                                  style: Theme.of(context)
                                      .textTheme
                                      .bodyLarge
                                      ?.copyWith(fontWeight: FontWeight.w600),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  '对话 ${report.conversationId}',
                                  style: Theme.of(context)
                                      .textTheme
                                      .bodySmall
                                      ?.copyWith(color: AppColors.textSecondary),
                                ),
                              ],
                            ),
                          ),
                          _StatusChip(label: _statusLabel(report.status)),
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

  String _statusLabel(ReportStatus status) {
    switch (status) {
      case ReportStatus.finalStatus:
        return 'final';
      case ReportStatus.archived:
        return 'archived';
      case ReportStatus.draft:
      default:
        return 'draft';
    }
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.bgSecondary,
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
      color: AppColors.bgSecondary,
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

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final isFinal = label == 'final';
    final color = isFinal ? const Color(0xFF10B981) : const Color(0xFFF59E0B);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: color,
              fontWeight: FontWeight.w600,
            ),
      ),
    );
  }
}

class _SidebarReportItem extends StatelessWidget {
  const _SidebarReportItem({
    required this.title,
    required this.subtitle,
    required this.isActive,
    this.onTap,
  });

  final String title;
  final String subtitle;
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
              Icon(Icons.description_outlined,
                  size: 20, color: titleColor.withOpacity(0.6)),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            fontSize: 14,
                            color: titleColor,
                            fontWeight:
                                isActive ? FontWeight.w600 : FontWeight.w500,
                          ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            fontSize: 12,
                            color: AppColors.textTertiary,
                          ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
