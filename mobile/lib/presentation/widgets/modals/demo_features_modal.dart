import 'package:flutter/material.dart';

import '../../themes/app_colors.dart';
import '../../themes/app_spacing.dart';
import '../../themes/app_radius.dart';

/// Demo功能
class DemoFeature {
  final String title;
  final String desc;
  final bool isCore;

  const DemoFeature({
    required this.title,
    required this.desc,
    this.isCore = false,
  });
}

/// Demo功能确认Modal
/// 对齐Web端 index.html:589-617
class DemoFeaturesModal extends StatefulWidget {
  const DemoFeaturesModal({
    super.key,
    required this.demoType,
  });

  final String demoType;

  static Future<List<String>?> show(BuildContext context, {required String demoType}) {
    return showDialog<List<String>>(
      context: context,
      barrierDismissible: true,
      builder: (_) => DemoFeaturesModal(demoType: demoType),
    );
  }

  @override
  State<DemoFeaturesModal> createState() => _DemoFeaturesModalState();
}

class _DemoFeaturesModalState extends State<DemoFeaturesModal> {
  late Set<String> _selectedFeatures;

  // Mock功能列表（对齐Web端 app-config.js:84-95）
  static const _features = {
    'web': [
      DemoFeature(title: '首页展示', desc: '产品介绍、核心价值展示', isCore: true),
      DemoFeature(title: '功能介绍页', desc: '详细功能说明和使用场景', isCore: true),
      DemoFeature(title: '响应式布局', desc: '适配桌面端和移动端', isCore: true),
      DemoFeature(title: '用户注册/登录', desc: '账号体系和权限管理'),
      DemoFeature(title: '数据可视化', desc: '图表展示和数据分析'),
      DemoFeature(title: '支付功能', desc: '在线支付和订单管理'),
      DemoFeature(title: '评论互动', desc: '用户评论和社交互动'),
    ],
    'app': [
      DemoFeature(title: '启动页面', desc: '品牌展示和引导页', isCore: true),
      DemoFeature(title: '主界面', desc: '核心功能导航和展示', isCore: true),
      DemoFeature(title: '手势交互', desc: '下拉刷新、左滑等手势', isCore: true),
      DemoFeature(title: '推送通知', desc: '消息推送和提醒'),
      DemoFeature(title: '地图定位', desc: 'LBS功能和地图展示'),
      DemoFeature(title: '相机相册', desc: '拍照上传和图片选择'),
    ],
  };

  @override
  void initState() {
    super.initState();
    final features = _features[widget.demoType] ?? [];
    _selectedFeatures = features.where((f) => f.isCore).map((f) => f.title).toSet();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final borderColor = isDark ? AppColorsDark.border : AppColors.border;
    final bgPrimary = isDark ? AppColorsDark.bgPrimary : AppColors.bgPrimary;
    final bgSecondary = isDark ? AppColorsDark.bgSecondary : AppColors.bgSecondary;

    final features = _features[widget.demoType] ?? [];

    return Dialog(
      backgroundColor: bgPrimary,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.lg),
      ),
      child: Container(
        width: MediaQuery.of(context).size.width * 0.9,
        constraints: const BoxConstraints(maxWidth: 700, maxHeight: 700),
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
                      '确认Demo功能',
                      style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600),
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
            Expanded(
              child: SingleChildScrollView(
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
                        'AI已根据您的创意分析出以下核心功能，请确认或调整',
                        style: TextStyle(
                          fontSize: 14,
                          color: isDark ? AppColorsDark.textSecondary : AppColors.textSecondary,
                        ),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.lg + 8),

                    ...features.map((feature) => _buildFeatureItem(feature, isDark, bgSecondary, borderColor)),
                  ],
                ),
              ),
            ),

            // Footer
            Container(
              padding: const EdgeInsets.all(AppSpacing.lg),
              decoration: BoxDecoration(
                border: Border(top: BorderSide(color: borderColor, width: 2)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  RichText(
                    text: TextSpan(
                      style: TextStyle(
                        fontSize: 14,
                        color: isDark ? AppColorsDark.textSecondary : AppColors.textSecondary,
                      ),
                      children: [
                        const TextSpan(text: '已选择 '),
                        TextSpan(
                          text: '${_selectedFeatures.length}',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: theme.colorScheme.primary,
                          ),
                        ),
                        const TextSpan(text: ' 个功能'),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  ElevatedButton(
                    onPressed: _selectedFeatures.isEmpty
                        ? null
                        : () => Navigator.pop(context, _selectedFeatures.toList()),
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                    child: const Text('开始生成Demo'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFeatureItem(DemoFeature feature, bool isDark, Color bgSecondary, Color borderColor) {
    final isSelected = _selectedFeatures.contains(feature.title);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: bgSecondary,
        borderRadius: BorderRadius.circular(AppRadius.sm),
        border: Border.all(
          color: isSelected
              ? Theme.of(context).colorScheme.primary
              : borderColor,
          width: isSelected ? 2 : 1,
        ),
      ),
      child: CheckboxListTile(
        value: isSelected,
        enabled: !feature.isCore,
        onChanged: feature.isCore
            ? null
            : (bool? value) {
                setState(() {
                  if (value == true) {
                    _selectedFeatures.add(feature.title);
                  } else {
                    _selectedFeatures.remove(feature.title);
                  }
                });
              },
        title: Row(
          children: [
            Expanded(
              child: Text(
                feature.title,
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: isDark ? AppColorsDark.textPrimary : AppColors.textPrimary,
                ),
              ),
            ),
            if (feature.isCore)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.primary.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  '核心',
                  style: TextStyle(
                    fontSize: 12,
                    color: Theme.of(context).colorScheme.primary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
          ],
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 4),
          child: Text(
            feature.desc,
            style: TextStyle(
              fontSize: 13,
              color: isDark ? AppColorsDark.textSecondary : AppColors.textSecondary,
            ),
          ),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        controlAffinity: ListTileControlAffinity.leading,
      ),
    );
  }
}
