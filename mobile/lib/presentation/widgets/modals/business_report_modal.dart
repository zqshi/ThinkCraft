import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../themes/app_colors.dart';
import '../../themes/app_spacing.dart';
import '../../themes/app_radius.dart';
import 'chapter_selection_modal.dart';

/// 商业计划书展示Modal
/// 对齐Web端 index.html:513-541
/// 预览和导出商业计划书/产品立项材料
class BusinessReportModal extends ConsumerStatefulWidget {
  const BusinessReportModal({
    super.key,
    required this.reportId,
    required this.reportTitle,
    required this.reportContent,
    required this.reportType,
  });

  final String reportId;
  final String reportTitle;
  final String reportContent;
  final String reportType; // 'business' 或 'proposal'

  static Future<void> show(
    BuildContext context, {
    required String reportId,
    required String reportTitle,
    required String reportContent,
    required String reportType,
  }) {
    return showDialog(
      context: context,
      barrierDismissible: true,
      builder: (_) => BusinessReportModal(
        reportId: reportId,
        reportTitle: reportTitle,
        reportContent: reportContent,
        reportType: reportType,
      ),
    );
  }

  @override
  ConsumerState<BusinessReportModal> createState() => _BusinessReportModalState();
}

class _BusinessReportModalState extends ConsumerState<BusinessReportModal> {
  bool _isRegenerating = false;

  Future<void> _regenerateReport() async {
    setState(() => _isRegenerating = true);
    // TODO: 调用后端API重新生成
    await Future.delayed(const Duration(seconds: 2));
    if (mounted) {
      setState(() => _isRegenerating = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('报告已重新生成')),
      );
    }
  }

  Future<void> _adjustChapters() async {
    final selectedChapters = await ChapterSelectionModal.show(
      context,
      type: widget.reportType,
    );

    if (selectedChapters != null && mounted) {
      // TODO: 根据新选择的章节重新生成
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('正在调整章节...')),
      );
    }
  }

  Future<void> _exportPDF() async {
    // TODO: 导出PDF
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('PDF导出功能开发中')),
    );
  }

  Future<void> _shareReport() async {
    // TODO: 分享报告
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('分享功能开发中')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final borderColor = isDark ? AppColorsDark.border : AppColors.border;
    final bgPrimary = isDark ? AppColorsDark.bgPrimary : AppColors.bgPrimary;

    return Dialog(
      backgroundColor: bgPrimary,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.lg),
      ),
      child: Container(
        width: MediaQuery.of(context).size.width * 0.95,
        height: MediaQuery.of(context).size.height * 0.9,
        constraints: const BoxConstraints(maxWidth: 1200),
        child: Column(
          children: [
            // Header
            Container(
              padding: const EdgeInsets.all(AppSpacing.lg),
              decoration: BoxDecoration(
                border: Border(bottom: BorderSide(color: borderColor)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Row(
                      children: [
                        Text(
                          widget.reportTitle,
                          style: theme.textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(width: 12),
                        OutlinedButton.icon(
                          onPressed: _isRegenerating ? null : _regenerateReport,
                          icon: _isRegenerating
                              ? const SizedBox(
                                  width: 14,
                                  height: 14,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                )
                              : const Text('🔄'),
                          label: const Text('重新生成'),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 6,
                            ),
                            textStyle: const TextStyle(fontSize: 13),
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                    padding: EdgeInsets.zero,
                  ),
                ],
              ),
            ),

            // Body - 报告内容
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(AppSpacing.lg + 8), // 24px
                child: SelectableText(
                  widget.reportContent,
                  style: TextStyle(
                    fontSize: 15,
                    height: 1.6,
                    color: isDark ? AppColorsDark.textPrimary : AppColors.textPrimary,
                  ),
                ),
              ),
            ),

            // Footer
            Container(
              padding: const EdgeInsets.all(AppSpacing.lg),
              decoration: BoxDecoration(
                border: Border(top: BorderSide(color: borderColor)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  OutlinedButton(
                    onPressed: _adjustChapters,
                    child: const Text('调整章节'),
                  ),
                  const SizedBox(width: 12),
                  OutlinedButton(
                    onPressed: _exportPDF,
                    child: const Text('导出PDF'),
                  ),
                  const SizedBox(width: 12),
                  ElevatedButton(
                    onPressed: _shareReport,
                    child: const Text('分享报告'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
