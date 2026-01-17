import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../application/state/business_plan_state.dart';
import '../../widgets/common/primary_button.dart';
import '../../widgets/common/text_input.dart';
import '../../widgets/layout/app_shell.dart';
import '../../themes/app_colors.dart';

class BusinessPlanPage extends ConsumerStatefulWidget {
  const BusinessPlanPage({super.key});

  @override
  ConsumerState<BusinessPlanPage> createState() => _BusinessPlanPageState();
}

class _BusinessPlanPageState extends ConsumerState<BusinessPlanPage> {
  final TextEditingController _promptController = TextEditingController();
  String _status = '';
  final List<String> _chapterIds = const [
    'executive_summary',
    'market_analysis',
    'solution',
    'business_model',
    'competitive_landscape',
    'marketing_strategy',
    'team_structure',
    'financial_projection',
    'risk_assessment',
    'implementation_plan',
    'appendix',
  ];

  @override
  void dispose() {
    _promptController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
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
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          _SectionCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TextInput(
                  controller: _promptController,
                  label: '输入对话摘要',
                  maxLines: 3,
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    PrimaryButton(
                      label: '生成',
                      onPressed: () async {
                        final prompt = _promptController.text.trim();
                        if (prompt.isEmpty) return;
                        final result = await ref.read(
                          businessPlanGenerateProvider({
                            'chapterIds': _chapterIds,
                            'conversationHistory': [
                              {'role': 'user', 'content': prompt},
                            ],
                          }).future,
                        );
                        ref.read(businessPlanResultProvider.notifier).state =
                            result;
                        setState(() {
                          _status =
                              '生成 ${result.chapters.length} 章节，tokens ${result.totalTokens}';
                        });
                        if (context.mounted) {
                          context.push('/business-plan/detail');
                        }
                      },
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        _status,
                        style: Theme.of(context)
                            .textTheme
                            .bodySmall
                            ?.copyWith(color: AppColors.textSecondary),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
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
          Icon(Icons.article_outlined,
              size: 20, color: AppColors.textSecondary.withOpacity(0.6)),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '商业计划书',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                ),
                const SizedBox(height: 2),
                Text(
                  '章节生成与导出',
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
