import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../application/state/business_plan_state.dart';
import '../../../application/state/pdf_export_state.dart';
import '../../widgets/common/primary_button.dart';
import '../../widgets/layout/app_shell.dart';
import '../../themes/app_colors.dart';

class BusinessPlanExportPage extends ConsumerWidget {
  const BusinessPlanExportPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final plan = ref.watch(businessPlanResultProvider);

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
      body: Center(
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: AppColors.bgSecondary,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.border),
          ),
          child: PrimaryButton(
            label: '导出 PDF',
            onPressed: plan == null
                ? null
                : () async {
                    final chapters = plan.chapters
                        .map((chapter) => {
                              'title': chapter.chapterId,
                              'content': chapter.content,
                            })
                        .toList();
                    final result = await ref.read(
                      pdfExportProvider({
                        'title': 'Business Plan',
                        'chapters': chapters,
                      }).future,
                    );
                    ref.read(pdfExportResultProvider.notifier).state = result;
                    if (context.mounted) {
                      context.push('/pdf-export/detail');
                    }
                  },
          ),
        ),
      ),
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
                  '商业计划书导出',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                ),
                const SizedBox(height: 2),
                Text(
                  'PDF 输出',
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
