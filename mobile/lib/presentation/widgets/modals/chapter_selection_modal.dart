import 'package:flutter/material.dart';

import '../../themes/app_colors.dart';
import '../../themes/app_spacing.dart';
import '../../themes/app_radius.dart';

/// 章节数据模型
class Chapter {
  final int id;
  final String title;
  final String desc;
  final String agent;
  final String emoji;
  final int time; // 预估时间（秒）

  const Chapter({
    required this.id,
    required this.title,
    required this.desc,
    required this.agent,
    required this.emoji,
    required this.time,
  });
}

/// 章节选择Modal
/// 对齐Web端 index.html:458-484
/// 显示核心章节（必选）和可选章节，计算预估时间
class ChapterSelectionModal extends StatefulWidget {
  const ChapterSelectionModal({
    super.key,
    required this.type,
  });

  final String type; // 'business' 或 'proposal'

  static Future<List<int>?> show(BuildContext context, {required String type}) {
    return showDialog<List<int>>(
      context: context,
      barrierDismissible: true,
      builder: (_) => ChapterSelectionModal(type: type),
    );
  }

  @override
  State<ChapterSelectionModal> createState() => _ChapterSelectionModalState();
}

class _ChapterSelectionModalState extends State<ChapterSelectionModal> {
  late Set<int> _selectedChapters;

  // 对齐Web端 mobile/js/app-config.js:47-81
  static const _chapters = {
    'business': {
      'core': [
        Chapter(id: 1, title: '执行摘要', desc: '一页纸概述项目核心亮点、市场机会和融资需求', agent: '综合分析师', emoji: '🤖', time: 30),
        Chapter(id: 2, title: '问题与市场分析', desc: '目标市场规模、用户痛点、市场机会分析', agent: '市场分析师', emoji: '📊', time: 45),
        Chapter(id: 3, title: '解决方案与产品演进', desc: '产品定位、核心功能、技术优势、发展路线图', agent: '技术架构师', emoji: '⚙️', time: 40),
        Chapter(id: 5, title: '商业模式与营收规划', desc: '收入模式、定价策略、营收预测', agent: '财务顾问', emoji: '💰', time: 50),
        Chapter(id: 11, title: '愿景与路线图', desc: '长期愿景、发展路线图、退出策略', agent: '综合分析师', emoji: '🤖', time: 30),
      ],
      'optional': [
        Chapter(id: 4, title: '竞争格局与核心壁垒', desc: '竞品分析、差异化优势、竞争壁垒', agent: '市场分析师', emoji: '📊', time: 35),
        Chapter(id: 6, title: '市场与增长策略', desc: '市场进入策略、获客渠道、增长规划', agent: '增长策略师', emoji: '📈', time: 40),
        Chapter(id: 7, title: '团队架构', desc: '核心团队、关键岗位、人才需求', agent: '组织架构顾问', emoji: '👥', time: 30),
        Chapter(id: 8, title: '财务预测', desc: '5年财务模型、收入/成本预测、盈利能力分析', agent: '财务顾问', emoji: '💰', time: 60),
        Chapter(id: 9, title: '融资需求与资金使用', desc: '融资金额、资金用途、里程碑规划', agent: '财务顾问', emoji: '💰', time: 35),
        Chapter(id: 10, title: '风险评估与应对', desc: '关键风险识别、应对措施、风险缓释策略', agent: '风险评估专家', emoji: '⚠️', time: 35),
      ],
    },
    'proposal': {
      'core': [
        Chapter(id: 1, title: '项目摘要', desc: '项目背景、目标、核心价值', agent: '综合分析师', emoji: '🤖', time: 30),
        Chapter(id: 2, title: '问题洞察', desc: '核心痛点、市场缺口分析', agent: '市场分析师', emoji: '📊', time: 40),
        Chapter(id: 3, title: '解决方案（三层架构）', desc: '协议层、引擎层、网络层设计', agent: '技术架构师', emoji: '⚙️', time: 50),
      ],
      'optional': [
        Chapter(id: 4, title: '竞争与壁垒', desc: '竞争分析与技术壁垒', agent: '市场分析师', emoji: '📊', time: 35),
        Chapter(id: 5, title: '商业模式', desc: '收入模式与定价策略', agent: '财务顾问', emoji: '💰', time: 45),
        Chapter(id: 6, title: '市场与增长', desc: '市场策略与增长路径', agent: '增长策略师', emoji: '📈', time: 40),
        Chapter(id: 7, title: '团队要求', desc: '团队构成与能力要求', agent: '组织架构顾问', emoji: '👥', time: 25),
        Chapter(id: 8, title: '财务预测与里程碑', desc: '财务模型与关键里程碑', agent: '财务顾问', emoji: '💰', time: 55),
        Chapter(id: 9, title: '风险与挑战', desc: '风险识别与应对策略', agent: '风险评估专家', emoji: '⚠️', time: 30),
        Chapter(id: 10, title: '结论', desc: '总结与展望', agent: '综合分析师', emoji: '🤖', time: 20),
      ],
    },
  };

  @override
  void initState() {
    super.initState();
    // 默认选中所有核心章节
    final coreChapters = _chapters[widget.type]?['core'] ?? [];
    _selectedChapters = coreChapters.map((ch) => ch.id).toSet();
  }

  int get _totalTime {
    final allChapters = [
      ...(_chapters[widget.type]?['core'] ?? []),
      ...(_chapters[widget.type]?['optional'] ?? []),
    ];
    return allChapters
        .where((ch) => _selectedChapters.contains(ch.id))
        .fold(0, (sum, ch) => sum + ch.time);
  }

  String get _timeDisplay {
    final minutes = (_totalTime / 60).ceil();
    return '$minutes分钟';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final borderColor = isDark ? AppColorsDark.border : AppColors.border;
    final bgPrimary = isDark ? AppColorsDark.bgPrimary : AppColors.bgPrimary;
    final bgSecondary = isDark ? AppColorsDark.bgSecondary : AppColors.bgSecondary;

    final coreChapters = _chapters[widget.type]?['core'] ?? [];
    final optionalChapters = _chapters[widget.type]?['optional'] ?? [];

    return Dialog(
      backgroundColor: bgPrimary,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.lg),
      ),
      child: Container(
        width: MediaQuery.of(context).size.width * 0.9,
        constraints: const BoxConstraints(
          maxWidth: 700,
          maxHeight: 700,
        ),
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
                  Expanded(
                    child: Text(
                      '选择需要生成的章节',
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

            // Body
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(AppSpacing.lg),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // 提示文本
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: bgSecondary,
                        borderRadius: BorderRadius.circular(AppRadius.sm),
                      ),
                      child: Text(
                        '核心章节将自动生成，您可以选择需要深入分析的其他章节',
                        style: TextStyle(
                          fontSize: 14,
                          color: isDark ? AppColorsDark.textSecondary : AppColors.textSecondary,
                        ),
                      ),
                    ),

                    const SizedBox(height: AppSpacing.lg + 8), // 24px

                    // 核心章节（必选）
                    Text(
                      '核心章节（必选）',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: isDark ? AppColorsDark.textPrimary : AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.sm + 4), // 12px

                    ...coreChapters.map((chapter) => _buildChapterTile(
                          chapter,
                          isCore: true,
                          isDark: isDark,
                        )),

                    const SizedBox(height: AppSpacing.lg + 8), // 24px

                    // 可选章节
                    Text(
                      '可选章节',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: isDark ? AppColorsDark.textPrimary : AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.sm + 4), // 12px

                    ...optionalChapters.map((chapter) => _buildChapterTile(
                          chapter,
                          isCore: false,
                          isDark: isDark,
                        )),
                  ],
                ),
              ),
            ),

            // Footer - 统计和开始按钮
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
                        const TextSpan(text: '已选 '),
                        TextSpan(
                          text: '${_selectedChapters.length}',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: theme.colorScheme.primary,
                          ),
                        ),
                        const TextSpan(text: ' 个章节，预计用时 '),
                        TextSpan(
                          text: _timeDisplay,
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: theme.colorScheme.primary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  ElevatedButton(
                    onPressed: _selectedChapters.isEmpty
                        ? null
                        : () => Navigator.pop(context, _selectedChapters.toList()),
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                    child: const Text('开始生成'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildChapterTile(Chapter chapter, {required bool isCore, required bool isDark}) {
    final isSelected = _selectedChapters.contains(chapter.id);
    final bgSecondary = isDark ? AppColorsDark.bgSecondary : AppColors.bgSecondary;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: bgSecondary,
        borderRadius: BorderRadius.circular(AppRadius.sm),
        border: Border.all(
          color: isSelected
              ? Theme.of(context).colorScheme.primary
              : (isDark ? AppColorsDark.border : AppColors.border),
          width: isSelected ? 2 : 1,
        ),
      ),
      child: CheckboxListTile(
        value: isSelected,
        enabled: !isCore, // 核心章节禁用复选框
        onChanged: isCore
            ? null
            : (bool? value) {
                setState(() {
                  if (value == true) {
                    _selectedChapters.add(chapter.id);
                  } else {
                    _selectedChapters.remove(chapter.id);
                  }
                });
              },
        title: Row(
          children: [
            Text(chapter.emoji, style: const TextStyle(fontSize: 18)),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                chapter.title,
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: isDark ? AppColorsDark.textPrimary : AppColors.textPrimary,
                ),
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primary.withOpacity(0.1),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                '${chapter.time}s',
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
          padding: const EdgeInsets.only(left: 26, top: 4),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                chapter.desc,
                style: TextStyle(
                  fontSize: 13,
                  color: isDark ? AppColorsDark.textSecondary : AppColors.textSecondary,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                '负责人：${chapter.agent}',
                style: TextStyle(
                  fontSize: 12,
                  color: isDark ? AppColorsDark.textTertiary : AppColors.textTertiary,
                ),
              ),
            ],
          ),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        controlAffinity: ListTileControlAffinity.leading,
      ),
    );
  }
}
