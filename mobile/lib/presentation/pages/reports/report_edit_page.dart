import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../application/state/providers.dart';
import '../../../application/state/report_detail_state.dart';
import '../../widgets/common/primary_button.dart';
import '../../widgets/common/text_input.dart';
import '../../widgets/layout/app_shell.dart';
import '../../themes/app_colors.dart';

class ReportEditPage extends ConsumerStatefulWidget {
  const ReportEditPage({super.key, required this.reportId});

  final String reportId;

  @override
  ConsumerState<ReportEditPage> createState() => _ReportEditPageState();
}

class _ReportEditPageState extends ConsumerState<ReportEditPage> {
  final TextEditingController _dataController = TextEditingController();
  String _status = '';

  @override
  void dispose() {
    _dataController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final reportAsync = ref.watch(reportDetailProvider(widget.reportId));

    return AppShell(
      title: 'ThinkCraft AI',
      sidebar: AppSidebar(
        content: ListView(
          padding: const EdgeInsets.all(12),
          children: const [
            _SidebarNote(),
          ],
        ),
      ),
      body: reportAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Failed to load report: $err')),
        data: (report) {
          if (report == null) {
            return const Center(child: Text('Report not found'));
          }
          if (_dataController.text.isEmpty) {
            _dataController.text = report.data.toString();
          }
          return ListView(
            padding: const EdgeInsets.all(24),
            children: [
              _SectionCard(
                child: Column(
                  children: [
                    TextInput(
                      controller: _dataController,
                      label: '报告数据（JSON）',
                      maxLines: 8,
                    ),
                    const SizedBox(height: 12),
                    if (_status.isNotEmpty) Text(_status),
                    const SizedBox(height: 12),
                    PrimaryButton(
                      label: '保存',
                      onPressed: () async {
                        final raw = _dataController.text.trim();
                        Map<String, dynamic> payload;
                        try {
                          final decoded = jsonDecode(raw);
                          if (decoded is Map<String, dynamic>) {
                            payload = decoded;
                          } else {
                            payload = {'content': decoded};
                          }
                        } catch (_) {
                          payload = {'content': raw};
                        }
                        await ref
                            .read(reportRepositoryProvider)
                            .updateReportData(report.id, payload);
                        setState(() => _status = 'Saved.');
                        if (context.mounted) {
                          Navigator.of(context).pop();
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

class _SidebarNote extends StatelessWidget {
  const _SidebarNote();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      margin: const EdgeInsets.only(bottom: 4),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8),
        color: AppColors.bgSecondary,
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Icon(Icons.edit_outlined,
              size: 20, color: AppColors.textSecondary.withOpacity(0.7)),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '编辑报告',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                ),
                const SizedBox(height: 2),
                Text(
                  'JSON 内容维护',
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
    );
  }
}
