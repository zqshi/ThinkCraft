import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../themes/app_colors.dart';
import '../../themes/app_spacing.dart';
import '../../themes/app_radius.dart';
import 'chapter_selection_modal.dart';

/// 报告预览Modal
/// 对齐Web端 index.html:307-381
/// 显示创意分析报告，提供深度分析和Demo生成入口
class ReportPreviewModal extends ConsumerStatefulWidget {
  const ReportPreviewModal({
    super.key,
    required this.reportId,
    required this.reportContent,
    required this.conversationId,
  });

  final String reportId;
  final String reportContent;
  final String conversationId;

  static Future<void> show(
    BuildContext context, {
    required String reportId,
    required String reportContent,
    required String conversationId,
  }) {
    return showDialog(
      context: context,
      barrierDismissible: true,
      builder: (_) => ReportPreviewModal(
        reportId: reportId,
        reportContent: reportContent,
        conversationId: conversationId,
      ),
    );
  }

  @override
  ConsumerState<ReportPreviewModal> createState() => _ReportPreviewModalState();
}

class _ReportPreviewModalState extends ConsumerState<ReportPreviewModal> {
  bool _isRegenerating = false;

  Future<void> _regenerateReport() async {
    setState(() => _isRegenerating = true);
    // TODO: 调用后端API重新生成报告
    await Future.delayed(const Duration(seconds: 2));
    if (mounted) {
      setState(() => _isRegenerating = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('报告已重新生成')),
      );
    }
  }

  Future<void> _handleGenerationType(String type) async {
    Navigator.pop(context);

    final selectedChapters = await ChapterSelectionModal.show(context, type: type);

    if (selectedChapters != null && mounted) {
      // TODO: 启动Agent进度Modal
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('开始生成${type == 'business' ? '商业计划书' : '产品立项材料'}')),
      );
    }
  }

  Future<void> _generateDemo() async {
    Navigator.pop(context);
    // TODO: 显示Demo类型选择Modal
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Demo生成功能开发中')),
    );
  }

  Future<void> _exportPDF() async {
    // TODO: 导出PDF
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('PDF导出功能开发中')),
    );
  }

  Future<void> _generateShareLink() async {
    // TODO: 生成分享链接
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
        width: MediaQuery.of(context).size.width * 0.9,
        constraints: BoxConstraints(
          maxWidth: 1000,
          maxHeight: MediaQuery.of(context).size.height * 0.9,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header - 对齐Web端 .modal-header
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
                          '创意思维结构化分析报告',
                          style: theme.textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(width: 12),
                        // 重新生成按钮
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
                  // 关闭按钮
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

            // Footer - 对齐Web端 .modal-footer
            Container(
              padding: const EdgeInsets.all(AppSpacing.lg),
              decoration: BoxDecoration(
                border: Border(top: BorderSide(color: borderColor)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // 深度分析按钮组
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () => _handleGenerationType('business'),
                          icon: const Text('📊'),
                          label: const Text('商业计划书'),
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 16),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () => _handleGenerationType('proposal'),
                          icon: const Text('📋'),
                          label: const Text('产品立项材料'),
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 16),
                          ),
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 16),

                  // Demo生成区域 - 对齐Web端渐变背景
                  Container(
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [Color(0xFF667EEA), Color(0xFF764BA2)],
                      ),
                      borderRadius: BorderRadius.circular(AppRadius.md),
                    ),
                    padding: const EdgeInsets.all(AppSpacing.lg + 4), // 20px
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                '🚀 第二阶段：验证与快速原型',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w600,
                                  fontSize: 16,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '基于您的创意，让AI快速生成可交互的产品Demo',
                                style: TextStyle(
                                  color: Colors.white.withOpacity(0.9),
                                  fontSize: 14,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 16),
                        ElevatedButton.icon(
                          onPressed: _generateDemo,
                          icon: const Text('🚀'),
                          label: const Text('开始生成Demo'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.white,
                            foregroundColor: const Color(0xFF667EEA),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 20,
                              vertical: 16,
                            ),
                            textStyle: const TextStyle(fontWeight: FontWeight.w600),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 16),

                  // 底部操作按钮
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      OutlinedButton(
                        onPressed: _exportPDF,
                        child: const Text('导出PDF'),
                      ),
                      const SizedBox(width: 12),
                      ElevatedButton(
                        onPressed: _generateShareLink,
                        child: const Text('分享链接'),
                      ),
                    ],
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
