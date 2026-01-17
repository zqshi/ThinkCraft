import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../themes/app_colors.dart';
import '../../themes/app_spacing.dart';
import '../../themes/app_radius.dart';

/// Agent工作状态
enum AgentStatus {
  waiting, // 等待中
  generating, // 生成中
  completed, // 已完成
}

/// Agent进度数据
class AgentProgressData {
  final String name;
  final String emoji;
  final String currentTask;
  final AgentStatus status;

  const AgentProgressData({
    required this.name,
    required this.emoji,
    required this.currentTask,
    required this.status,
  });
}

/// Agent进度Modal
/// 对齐Web端 index.html:487-510
/// 显示AI专家团队的实时工作进度
class AgentProgressModal extends ConsumerStatefulWidget {
  const AgentProgressModal({
    super.key,
    required this.taskId,
    required this.chapters,
  });

  final String taskId;
  final List<int> chapters; // 章节ID列表

  static Future<void> show(
    BuildContext context, {
    required String taskId,
    required List<int> chapters,
  }) {
    return showDialog(
      context: context,
      barrierDismissible: false, // 不可点击外部关闭
      builder: (_) => AgentProgressModal(
        taskId: taskId,
        chapters: chapters,
      ),
    );
  }

  @override
  ConsumerState<AgentProgressModal> createState() => _AgentProgressModalState();
}

class _AgentProgressModalState extends ConsumerState<AgentProgressModal> {
  double _progress = 0.0;
  String _progressText = '准备开始生成...';
  bool _isCompleted = false;
  bool _isCancelled = false;

  // Mock Agent列表
  final List<AgentProgressData> _agents = [
    const AgentProgressData(
      name: '综合分析师',
      emoji: '🤖',
      currentTask: '等待开始...',
      status: AgentStatus.waiting,
    ),
    const AgentProgressData(
      name: '市场分析师',
      emoji: '📊',
      currentTask: '等待开始...',
      status: AgentStatus.waiting,
    ),
    const AgentProgressData(
      name: '技术架构师',
      emoji: '⚙️',
      currentTask: '等待开始...',
      status: AgentStatus.waiting,
    ),
    const AgentProgressData(
      name: '财务顾问',
      emoji: '💰',
      currentTask: '等待开始...',
      status: AgentStatus.waiting,
    ),
  ];

  @override
  void initState() {
    super.initState();
    _startMockGeneration();
  }

  Future<void> _startMockGeneration() async {
    // TODO: 替换为真实的Stream监听后端进度
    for (int i = 0; i < _agents.length; i++) {
      if (_isCancelled) break;

      setState(() {
        _agents[i] = AgentProgressData(
          name: _agents[i].name,
          emoji: _agents[i].emoji,
          currentTask: '正在生成章节内容...',
          status: AgentStatus.generating,
        );
        _progress = (i + 1) / _agents.length;
        _progressText = '正在生成第 ${i + 1}/${_agents.length} 个章节...';
      });

      await Future.delayed(const Duration(seconds: 2));

      if (_isCancelled) break;

      setState(() {
        _agents[i] = AgentProgressData(
          name: _agents[i].name,
          emoji: _agents[i].emoji,
          currentTask: '已完成',
          status: AgentStatus.completed,
        );
      });
    }

    if (!_isCancelled && mounted) {
      setState(() {
        _isCompleted = true;
        _progressText = '所有章节生成完成！';
      });

      // 2秒后自动关闭并跳转到报告展示
      await Future.delayed(const Duration(seconds: 2));
      if (mounted && !_isCancelled) {
        Navigator.pop(context, true); // 返回true表示完成
      }
    }
  }

  void _cancelGeneration() {
    setState(() => _isCancelled = true);
    Navigator.pop(context, false); // 返回false表示取消
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final bgPrimary = isDark ? AppColorsDark.bgPrimary : AppColors.bgPrimary;
    final bgSecondary = isDark ? AppColorsDark.bgSecondary : AppColors.bgSecondary;
    final borderColor = isDark ? AppColorsDark.border : AppColors.border;

    return Dialog(
      backgroundColor: bgPrimary,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.lg),
      ),
      child: Container(
        width: MediaQuery.of(context).size.width * 0.9,
        constraints: const BoxConstraints(
          maxWidth: 600,
          maxHeight: 600,
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
                      '🤖 AI专家团队正在工作中...',
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
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
                    // 整体进度条
                    Container(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      decoration: BoxDecoration(
                        color: bgSecondary,
                        borderRadius: BorderRadius.circular(AppRadius.sm),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // 进度条
                          ClipRRect(
                            borderRadius: BorderRadius.circular(4),
                            child: LinearProgressIndicator(
                              value: _progress,
                              minHeight: 8,
                              backgroundColor: borderColor,
                              valueColor: AlwaysStoppedAnimation<Color>(
                                theme.colorScheme.primary,
                              ),
                            ),
                          ),
                          const SizedBox(height: 8),
                          // 进度文本
                          Text(
                            _progressText,
                            style: TextStyle(
                              fontSize: 14,
                              color: isDark ? AppColorsDark.textSecondary : AppColors.textSecondary,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: AppSpacing.lg),

                    // Agent工作列表
                    ..._agents.map((agent) => _buildAgentItem(agent, isDark)),

                    const SizedBox(height: AppSpacing.lg),

                    // 取消按钮（完成后变为"查看报告"）
                    if (!_isCompleted)
                      OutlinedButton(
                        onPressed: _cancelGeneration,
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                        ),
                        child: const Text('取消生成'),
                      )
                    else
                      ElevatedButton(
                        onPressed: () => Navigator.pop(context, true),
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                        ),
                        child: const Text('查看报告'),
                      ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAgentItem(AgentProgressData agent, bool isDark) {
    final bgSecondary = isDark ? AppColorsDark.bgSecondary : AppColors.bgSecondary;

    Color statusColor;
    IconData statusIcon;
    switch (agent.status) {
      case AgentStatus.waiting:
        statusColor = isDark ? AppColorsDark.textTertiary : AppColors.textTertiary;
        statusIcon = Icons.schedule;
        break;
      case AgentStatus.generating:
        statusColor = Colors.blue;
        statusIcon = Icons.sync;
        break;
      case AgentStatus.completed:
        statusColor = Colors.green;
        statusIcon = Icons.check_circle;
        break;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: bgSecondary,
        borderRadius: BorderRadius.circular(AppRadius.sm),
        border: Border.all(
          color: agent.status == AgentStatus.generating
              ? Colors.blue.withOpacity(0.3)
              : (isDark ? AppColorsDark.border : AppColors.border),
          width: agent.status == AgentStatus.generating ? 2 : 1,
        ),
      ),
      child: Row(
        children: [
          // Emoji图标
          Text(
            agent.emoji,
            style: const TextStyle(fontSize: 24),
          ),
          const SizedBox(width: 12),
          // Agent信息
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  agent.name,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: isDark ? AppColorsDark.textPrimary : AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  agent.currentTask,
                  style: TextStyle(
                    fontSize: 13,
                    color: isDark ? AppColorsDark.textSecondary : AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          // 状态图标
          if (agent.status == AgentStatus.generating)
            SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                valueColor: AlwaysStoppedAnimation<Color>(statusColor),
              ),
            )
          else
            Icon(
              statusIcon,
              color: statusColor,
              size: 20,
            ),
        ],
      ),
    );
  }
}
