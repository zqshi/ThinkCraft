import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../application/state/providers.dart';
import '../../../application/state/report_detail_state.dart';
import '../../../application/state/report_state.dart';
import 'report_edit_page.dart';
import '../../../application/state/pdf_export_state.dart';
import 'package:go_router/go_router.dart';
import '../../../domain/report/models/report.dart';
import '../../../application/state/session_state.dart';
import '../../widgets/business/markdown_viewer.dart';
import '../../widgets/common/primary_button.dart';
import '../../widgets/common/secondary_button.dart';
import '../../widgets/layout/app_shell.dart';
import '../../themes/app_colors.dart';

class ReportDetailPage extends ConsumerWidget {
  const ReportDetailPage({super.key, required this.reportId});

  final String reportId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reportAsync = ref.watch(reportDetailProvider(reportId));
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
                final isActive = report.id == reportId;
                return _SidebarReportItem(
                  title: '报告 ${report.id}',
                  subtitle: '对话 ${report.conversationId}',
                  isActive: isActive,
                  onTap: () => context.push('/reports/${report.id}'),
                );
              },
            );
          },
        ),
      ),
      body: reportAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Failed to load report: $err')),
        data: (report) {
          if (report == null) {
            return const Center(child: Text('Report not found'));
          }
          return ListView(
            padding: const EdgeInsets.all(24),
            children: [
              _ReportHeader(
                report: report,
                statusLabel: _statusLabel(report.status),
              ),
              _ReportSection(
                title: '摘要',
                child: _SummaryGrid(children: _buildSummary(report.data)),
              ),
              _ReportSection(
                title: '章节',
                child: Column(
                  children: _buildChapters(report.data),
                ),
              ),
              _ReportSection(
                title: '操作',
                child: Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  children: [
                    PrimaryButton(
                      label: '标记完成',
                      onPressed: () async {
                        await ref
                            .read(reportRepositoryProvider)
                            .updateReportStatus(report.id, 'final');
                        ref.invalidate(reportDetailProvider(report.id));
                      },
                    ),
                    SecondaryButton(
                      label: '编辑',
                      onPressed: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => ReportEditPage(reportId: report.id),
                          ),
                        );
                      },
                    ),
                    SecondaryButton(
                      label: '重新生成',
                      onPressed: () async {
                        await ref.read(reportRepositoryProvider).regenerateReport(
                              report.id,
                              const [
                                {'role': 'user', 'content': 'Regenerate report.'},
                              ],
                            );
                        ref.invalidate(reportDetailProvider(report.id));
                      },
                    ),
                    PrimaryButton(
                      label: '导出 PDF',
                      onPressed: () async {
                        final chapters =
                            report.data['chapters'] as Map<String, dynamic>? ??
                                {};
                        final sections = chapters.entries.map((entry) {
                          final chapter =
                              entry.value as Map<String, dynamic>? ?? {};
                          final title =
                              chapter['title']?.toString() ?? entry.key;
                          final content = chapter.entries
                              .where((item) => item.key != 'title')
                              .map((item) => '${item.key}: ${item.value}')
                              .join('\n');
                          return {
                            'title': title,
                            'content': content.isEmpty
                                ? report.data.toString()
                                : content,
                          };
                        }).toList();
                        if (sections.isEmpty) {
                          sections.add({
                            'title': 'Report',
                            'content': report.data.toString(),
                          });
                        }
                        final result = await ref.read(
                          pdfExportProvider({
                            'title': 'Report ${report.id}',
                            'chapters': sections,
                          }).future,
                        );
                        ref.read(pdfExportResultProvider.notifier).state =
                            result;
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                                content:
                                    Text('PDF ready: ${result.downloadUrl}')),
                          );
                          context.push('/pdf-export/detail');
                        }
                      },
                    ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  List<Widget> _buildSummary(Map<String, dynamic> data) {
    final summaryItems = <Map<String, String>>[
      {'title': 'Initial Idea', 'value': data['initialIdea']?.toString() ?? ''},
      {'title': 'Core Definition', 'value': data['coreDefinition']?.toString() ?? ''},
      {'title': 'Target User', 'value': data['targetUser']?.toString() ?? ''},
      {'title': 'Problem', 'value': data['problem']?.toString() ?? ''},
      {'title': 'Solution', 'value': data['solution']?.toString() ?? ''},
      {'title': 'Validation', 'value': data['validation']?.toString() ?? ''},
    ].where((item) => item['value']!.isNotEmpty).toList();

    if (summaryItems.isEmpty) {
      return [const Text('No summary data available.')];
    }

    return summaryItems.map((item) {
      return _AnalysisCard(
        title: item['title']!,
        content: item['value']!,
      );
    }).toList();
  }

  List<Widget> _buildChapters(Map<String, dynamic> data) {
    final chapters = data['chapters'] as Map<String, dynamic>? ?? {};
    if (chapters.isEmpty) {
      return [const Text('No chapters available.')];
    }

    return chapters.entries.map((entry) {
      final chapter = entry.value as Map<String, dynamic>? ?? {};
      final title = chapter['title']?.toString() ?? entry.key;
      final content = chapter.entries
          .where((item) => item.key != 'title')
          .map((item) => '- ${item.value}')
          .join('\n');

      return Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: _AnalysisCard(
          title: title,
          contentWidget: MarkdownViewer(content: content),
        ),
      );
    }).toList();
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

class _ReportHeader extends StatelessWidget {
  const _ReportHeader({required this.report, required this.statusLabel});

  final Report report;
  final String statusLabel;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      margin: const EdgeInsets.only(bottom: 24),
      decoration: BoxDecoration(
        color: AppColors.bgSecondary,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '报告 ${report.id}',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary,
                ),
          ),
          const SizedBox(height: 6),
          Text(
            '对话 ${report.conversationId}',
            style: Theme.of(context)
                .textTheme
                .bodySmall
                ?.copyWith(color: AppColors.textSecondary),
          ),
          const SizedBox(height: 6),
          Text(
            '状态 $statusLabel',
            style: Theme.of(context)
                .textTheme
                .bodySmall
                ?.copyWith(color: AppColors.textSecondary),
          ),
        ],
      ),
    );
  }
}

class _ReportSection extends StatelessWidget {
  const _ReportSection({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
          ),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }
}

class _SummaryGrid extends StatelessWidget {
  const _SummaryGrid({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth >= 640;
        final itemWidth =
            isWide ? (constraints.maxWidth - 16) / 2 : constraints.maxWidth;
        return Wrap(
          spacing: 16,
          runSpacing: 16,
          children: children
              .map((child) => SizedBox(width: itemWidth, child: child))
              .toList(),
        );
      },
    );
  }
}

class _AnalysisCard extends StatelessWidget {
  const _AnalysisCard({
    required this.title,
    this.content,
    this.contentWidget,
  });

  final String title;
  final String? content;
  final Widget? contentWidget;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.bgSecondary,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary,
                ),
          ),
          const SizedBox(height: 8),
          if (contentWidget != null)
            contentWidget!
          else
            Text(
              content ?? '',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppColors.textSecondary,
                    height: 1.6,
                  ),
            ),
        ],
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
