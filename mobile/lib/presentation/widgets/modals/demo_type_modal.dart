import 'package:flutter/material.dart';

import '../../themes/app_colors.dart';
import '../../themes/app_spacing.dart';
import '../../themes/app_radius.dart';

/// Demo类型
class DemoType {
  final String id;
  final String icon;
  final String title;
  final String desc;
  final bool isRecommended;

  const DemoType({
    required this.id,
    required this.icon,
    required this.title,
    required this.desc,
    this.isRecommended = false,
  });
}

/// Demo类型选择Modal
/// 对齐Web端 index.html:544-586
class DemoTypeModal extends StatelessWidget {
  const DemoTypeModal({super.key});

  static Future<String?> show(BuildContext context) {
    return showDialog<String>(
      context: context,
      barrierDismissible: true,
      builder: (_) => const DemoTypeModal(),
    );
  }

  static const _types = [
    DemoType(
      id: 'web',
      icon: '🌐',
      title: '网站应用',
      desc: '响应式网站、落地页、SaaS平台等',
      isRecommended: true,
    ),
    DemoType(
      id: 'app',
      icon: '📱',
      title: '移动应用',
      desc: 'iOS/Android App原型，支持交互演示',
    ),
    DemoType(
      id: 'miniapp',
      icon: '🎯',
      title: '小程序',
      desc: '微信小程序、支付宝小程序等',
    ),
    DemoType(
      id: 'admin',
      icon: '💼',
      title: '管理后台',
      desc: '后台管理系统、数据面板等',
    ),
  ];

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
        width: MediaQuery.of(context).size.width * 0.9,
        constraints: const BoxConstraints(maxWidth: 800),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header
            Container(
              padding: const EdgeInsets.all(AppSpacing.lg),
              decoration: BoxDecoration(
                border: Border(bottom: BorderSide(color: borderColor)),
              ),
              child: Row(
                children: [
                  const Expanded(
                    child: Text(
                      '选择Demo类型',
                      style: TextStyle(
                        fontSize: 20,
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

            // Body
            Padding(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: bgSecondary,
                      borderRadius: BorderRadius.circular(AppRadius.sm),
                    ),
                    child: Text(
                      '选择您想要生成的Demo类型，AI将根据您的创意生成可交互的产品原型',
                      style: TextStyle(
                        fontSize: 14,
                        color: isDark ? AppColorsDark.textSecondary : AppColors.textSecondary,
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg + 8), // 24px

                  // Demo类型卡片（2列网格）
                  GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      crossAxisSpacing: 16,
                      mainAxisSpacing: 16,
                      childAspectRatio: 1.3,
                    ),
                    itemCount: _types.length,
                    itemBuilder: (context, index) {
                      final type = _types[index];
                      return _buildTypeCard(context, type, isDark, borderColor);
                    },
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTypeCard(
    BuildContext context,
    DemoType type,
    bool isDark,
    Color borderColor,
  ) {
    final bgSecondary = isDark ? AppColorsDark.bgSecondary : AppColors.bgSecondary;

    return InkWell(
      onTap: () => Navigator.pop(context, type.id),
      borderRadius: BorderRadius.circular(AppRadius.md),
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: bgSecondary,
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: Border.all(color: borderColor),
        ),
        child: Stack(
          children: [
            Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  type.icon,
                  style: const TextStyle(fontSize: 48),
                ),
                const SizedBox(height: 12),
                Text(
                  type.title,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: isDark ? AppColorsDark.textPrimary : AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  type.desc,
                  style: TextStyle(
                    fontSize: 13,
                    color: isDark ? AppColorsDark.textSecondary : AppColors.textSecondary,
                  ),
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
            if (type.isRecommended)
              Positioned(
                top: 0,
                right: 0,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.primary,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: const Text(
                    '推荐',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
