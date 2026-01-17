import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../application/state/collaboration_state.dart';
import '../../../application/state/providers.dart';
import '../../../application/state/session_state.dart';
import '../../../domain/collaboration/models/collaboration_analysis.dart';
import '../../../domain/collaboration/models/collaboration_execution.dart';
import '../../../domain/collaboration/models/collaboration_modes.dart';
import '../../widgets/common/primary_button.dart';
import '../../widgets/common/text_input.dart';
import '../../widgets/layout/app_shell.dart';
import '../../widgets/modals/collaboration_modal.dart';
import '../../themes/app_colors.dart';

class CollaborationPage extends ConsumerStatefulWidget {
  const CollaborationPage({super.key});

  @override
  ConsumerState<CollaborationPage> createState() => _CollaborationPageState();
}

class _CollaborationPageState extends ConsumerState<CollaborationPage> {
  final TextEditingController _goalController = TextEditingController();
  String _status = '';
  final Map<String, CollaborationAnalysis> _analysisByPlan = {};
  final Map<String, CollaborationModes> _modesByPlan = {};
  final Map<String, CollaborationExecutionResult> _executionByPlan = {};
  final Map<String, String> _selectedModeByPlan = {};

  @override
  void dispose() {
    _goalController.dispose();
    super.dispose();
  }

  List<String> _availableExecutionModes(CollaborationModes modes) {
    final modeKeys = modes.modes.keys.toSet();
    final available = <String>[];
    if (modeKeys.contains('workflowOrchestration')) {
      available.add('workflow');
    }
    if (modeKeys.contains('taskDecomposition')) {
      available.add('task_decomposition');
    }
    return available.isEmpty ? ['workflow'] : available;
  }

  String _labelForExecutionMode(String mode) {
    switch (mode) {
      case 'task_decomposition':
        return 'Task decomposition';
      case 'workflow':
      default:
        return 'Workflow';
    }
  }

  String _formatList(dynamic value) {
    if (value is List) {
      return value.map((item) => item.toString()).join(', ');
    }
    return '';
  }

  int _countFromMapList(Map<String, dynamic>? map, String key) {
    final value = map?[key];
    if (value is List) return value.length;
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final userId = ref.watch(currentUserIdProvider);
    final plansAsync = ref.watch(collaborationPlansProvider(userId));

    return AppShell(
      title: 'ThinkCraft AI',
      actions: [
        OutlinedButton(
          onPressed: () => CollaborationModal.show(context),
          child: const Text('打开协同面板'),
        ),
      ],
      sidebar: AppSidebar(
        content: plansAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (err, _) => Center(child: Text('Failed to load plans: $err')),
          data: (plans) {
            if (plans.isEmpty) {
              return const Center(child: Text('暂无协同计划'));
            }
            return ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: plans.length,
              itemBuilder: (context, index) {
                final plan = plans[index];
                return _SidebarPlanItem(
                  title: plan.goal,
                  subtitle: '状态 ${plan.status.name}',
                );
              },
            );
          },
        ),
      ),
      body: plansAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Failed to load plans: $err')),
        data: (plans) {
          return ListView(
            padding: const EdgeInsets.all(24),
            children: [
              _SectionCard(
                child: Row(
                  children: [
                    Expanded(
                      child: TextInput(
                        controller: _goalController,
                        label: '输入协同目标',
                      ),
                    ),
                    const SizedBox(width: 8),
                    PrimaryButton(
                      label: '创建',
                      onPressed: () async {
                        final goal = _goalController.text.trim();
                        if (goal.isEmpty) return;
                        final useCase =
                            ref.read(createCollaborationPlanUseCaseProvider);
                        await useCase.execute(userId: userId, goal: goal);
                        _goalController.clear();
                        setState(() => _status = '计划已创建');
                        ref.invalidate(collaborationPlansProvider(userId));
                      },
                    ),
                  ],
                ),
              ),
              if (_status.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(_status),
              ],
              const SizedBox(height: 16),
              Text(
                '协同计划',
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 8),
              if (plans.isEmpty)
                const Center(child: Text('暂无协同计划。'))
              else
                ...plans.map((plan) {
                  final analysis = _analysisByPlan[plan.id];
                  final modes = _modesByPlan[plan.id];
                  final execution = _executionByPlan[plan.id];
                  final analysisPayload =
                      analysis?.payload['analysis'] as Map<String, dynamic>?;
                  final availableModes = modes == null
                      ? <String>[]
                      : _availableExecutionModes(modes);
                  final selectedMode = _selectedModeByPlan[plan.id] ??
                      (availableModes.isNotEmpty ? availableModes.first : 'workflow');
                  final workflowSteps = _countFromMapList(
                    modes?.modes['workflowOrchestration'] as Map<String, dynamic>?,
                    'steps',
                  );
                  final recommendedRoles = _countFromMapList(
                    modes?.modes['roleRecommendation'] as Map<String, dynamic>?,
                    'recommended',
                  );
                  final mainTasks = _countFromMapList(
                    modes?.modes['taskDecomposition'] as Map<String, dynamic>?,
                    'mainTasks',
                  );

                  return Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: _ListCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            plan.goal,
                            style: Theme.of(context)
                                .textTheme
                                .titleMedium
                                ?.copyWith(fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 4),
                          Text('状态 ${plan.status.name}'),
                          if (analysis != null) ...[
                            const SizedBox(height: 12),
                            Text(
                              '能力分析: ${analysis.nextStep}',
                              style: Theme.of(context).textTheme.titleSmall,
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '满足度 ${analysisPayload?['isSufficient'] ?? false}，'
                              '置信度 ${analysisPayload?['confidenceScore'] ?? 0}%',
                            ),
                            if (_formatList(analysisPayload?['requiredSkills']).isNotEmpty)
                              Text(
                                '所需技能 ${_formatList(analysisPayload?['requiredSkills'])}',
                              ),
                            if (_formatList(analysisPayload?['warnings']).isNotEmpty)
                              Text(
                                '提示 ${_formatList(analysisPayload?['warnings'])}',
                              ),
                          ],
                          if (modes != null) ...[
                            const SizedBox(height: 12),
                            Text(
                              '协同模式',
                              style: Theme.of(context).textTheme.titleSmall,
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '流程 $workflowSteps 步，推荐角色 $recommendedRoles，任务 $mainTasks',
                            ),
                          ],
                          if (execution != null) ...[
                            const SizedBox(height: 12),
                            Text(
                              '执行结果',
                              style: Theme.of(context).textTheme.titleSmall,
                            ),
                            const SizedBox(height: 4),
                            Text(
                              execution.summary.isEmpty
                                  ? '执行完成'
                                  : execution.summary,
                            ),
                          ],
                          const SizedBox(height: 12),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            crossAxisAlignment: WrapCrossAlignment.center,
                            children: [
                              TextButton(
                                onPressed: () async {
                                  final useCase =
                                      ref.read(analyzeCollaborationUseCaseProvider);
                                  try {
                                    final result =
                                        await useCase.execute(planId: plan.id);
                                    if (!mounted) return;
                                    setState(() {
                                      _analysisByPlan[plan.id] = result;
                                      _status = '下一步 ${result.nextStep}';
                                    });
                                  } catch (error) {
                                    if (!mounted) return;
                                    setState(() => _status = '分析失败: $error');
                                  }
                                },
                                child: const Text('分析'),
                              ),
                              TextButton(
                                onPressed: () async {
                                  final useCase = ref.read(
                                      generateCollaborationModesUseCaseProvider);
                                  try {
                                    final result =
                                        await useCase.execute(planId: plan.id);
                                    if (!mounted) return;
                                    final modesList = _availableExecutionModes(result);
                                    setState(() {
                                      _modesByPlan[plan.id] = result;
                                      _selectedModeByPlan[plan.id] =
                                          modesList.isNotEmpty
                                              ? modesList.first
                                              : 'workflow';
                                      _status = '已生成模式';
                                    });
                                  } catch (error) {
                                    if (!mounted) return;
                                    setState(() => _status = '生成失败: $error');
                                  }
                                },
                                child: const Text('生成模式'),
                              ),
                              if (availableModes.isNotEmpty)
                                DropdownButton<String>(
                                  value: selectedMode,
                                  items: availableModes
                                      .map(
                                        (mode) => DropdownMenuItem<String>(
                                          value: mode,
                                          child: Text(_labelForExecutionMode(mode)),
                                        ),
                                      )
                                      .toList(),
                                  onChanged: (value) {
                                    if (value == null) return;
                                    setState(() {
                                      _selectedModeByPlan[plan.id] = value;
                                    });
                                  },
                                ),
                              TextButton(
                                onPressed: () async {
                                  final useCase =
                                      ref.read(executeCollaborationUseCaseProvider);
                                  try {
                                    final result = await useCase.execute(
                                      planId: plan.id,
                                      mode: selectedMode,
                                    );
                                    if (!mounted) return;
                                    setState(() {
                                      _executionByPlan[plan.id] = result;
                                      _status = result.summary.isEmpty
                                          ? '执行完成'
                                          : result.summary;
                                    });
                                  } catch (error) {
                                    if (!mounted) return;
                                    setState(() => _status = '执行失败: $error');
                                  }
                                },
                                child: const Text('执行'),
                              ),
                            ],
                          ),
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
  const _ListCard({required this.child});

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

class _SidebarPlanItem extends StatelessWidget {
  const _SidebarPlanItem({
    required this.title,
    required this.subtitle,
  });

  final String title;
  final String subtitle;

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
          Icon(Icons.hub_outlined,
              size: 20, color: AppColors.textSecondary.withOpacity(0.6)),
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
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
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
    );
  }
}
