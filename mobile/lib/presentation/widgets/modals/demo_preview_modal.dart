import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../themes/app_colors.dart';
import '../../themes/app_spacing.dart';
import '../../themes/app_radius.dart';

/// Demo预览Modal
/// 对齐Web端 index.html:656+
/// 显示生成的Demo代码和预览
class DemoPreviewModal extends StatefulWidget {
  const DemoPreviewModal({
    super.key,
    required this.demoId,
    required this.demoType,
    required this.demoCode,
  });

  final String demoId;
  final String demoType;
  final String demoCode;

  static Future<void> show(
    BuildContext context, {
    required String demoId,
    required String demoType,
    required String demoCode,
  }) {
    return showDialog(
      context: context,
      barrierDismissible: true,
      builder: (_) => DemoPreviewModal(
        demoId: demoId,
        demoType: demoType,
        demoCode: demoCode,
      ),
    );
  }

  @override
  State<DemoPreviewModal> createState() => _DemoPreviewModalState();
}

class _DemoPreviewModalState extends State<DemoPreviewModal> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _copyCode() async {
    await Clipboard.setData(ClipboardData(text: widget.demoCode));
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('代码已复制到剪贴板')),
      );
    }
  }

  Future<void> _downloadCode() async {
    // TODO: 实现下载功能
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('下载功能开发中')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final borderColor = isDark ? AppColorsDark.border : AppColors.border;
    final bgPrimary = isDark ? AppColorsDark.bgPrimary : AppColors.bgPrimary;
    final bgSecondary = isDark ? AppColorsDark.bgSecondary : AppColors.bgSecondary;

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
                    child: Text(
                      'Demo预览 - ${_getDemoTypeName()}',
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
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

            // Tab Bar
            Container(
              decoration: BoxDecoration(
                border: Border(bottom: BorderSide(color: borderColor)),
              ),
              child: TabBar(
                controller: _tabController,
                labelColor: theme.colorScheme.primary,
                unselectedLabelColor: isDark ? AppColorsDark.textSecondary : AppColors.textSecondary,
                indicatorColor: theme.colorScheme.primary,
                tabs: const [
                  Tab(text: '预览'),
                  Tab(text: '源代码'),
                ],
              ),
            ),

            // Tab View
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  // 预览标签页
                  Container(
                    padding: const EdgeInsets.all(AppSpacing.lg),
                    child: Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.web_outlined,
                            size: 64,
                            color: isDark ? AppColorsDark.textTertiary : AppColors.textTertiary,
                          ),
                          const SizedBox(height: 16),
                          Text(
                            'Demo预览功能开发中',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                              color: isDark ? AppColorsDark.textSecondary : AppColors.textSecondary,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            '请切换到"源代码"标签查看生成的代码',
                            style: TextStyle(
                              fontSize: 14,
                              color: isDark ? AppColorsDark.textTertiary : AppColors.textTertiary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  // 源代码标签页
                  Container(
                    color: bgSecondary,
                    padding: const EdgeInsets.all(AppSpacing.lg),
                    child: SingleChildScrollView(
                      child: SelectableText(
                        widget.demoCode,
                        style: TextStyle(
                          fontFamily: 'monospace',
                          fontSize: 13,
                          height: 1.5,
                          color: isDark ? AppColorsDark.textPrimary : AppColors.textPrimary,
                        ),
                      ),
                    ),
                  ),
                ],
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
                  OutlinedButton.icon(
                    onPressed: _copyCode,
                    icon: const Icon(Icons.copy),
                    label: const Text('复制代码'),
                  ),
                  const SizedBox(width: 12),
                  ElevatedButton.icon(
                    onPressed: _downloadCode,
                    icon: const Icon(Icons.download),
                    label: const Text('下载源码'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _getDemoTypeName() {
    switch (widget.demoType) {
      case 'web':
        return '网站应用';
      case 'app':
        return '移动应用';
      case 'miniapp':
        return '小程序';
      case 'admin':
        return '管理后台';
      default:
        return 'Demo';
    }
  }
}
