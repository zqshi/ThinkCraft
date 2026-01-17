import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../application/state/business_plan_state.dart';
import '../../widgets/business/markdown_viewer.dart';
import '../../widgets/layout/app_shell.dart';
import '../../widgets/common/primary_button.dart';
import '../../themes/app_colors.dart';

class BusinessPlanDetailPage extends ConsumerStatefulWidget {
  const BusinessPlanDetailPage({super.key});

  @override
  ConsumerState<BusinessPlanDetailPage> createState() => _BusinessPlanDetailPageState();
}

class _BusinessPlanDetailPageState extends ConsumerState<BusinessPlanDetailPage> {
  @override
  Widget build(BuildContext context) {
    final result = ref.watch(businessPlanResultProvider);
    return AppShell(
      title: 'ThinkCraft AI',
      sidebar: AppSidebar(
        content: result == null
            ? const Center(child: Text('暂无章节'))
            : ListView.builder(
                padding: const EdgeInsets.all(12),
                itemCount: result.chapters.length,
                itemBuilder: (context, index) {
                  final chapter = result.chapters[index];
                  return _SidebarChapterItem(
                    title: _formatChapterTitle(chapter.chapterId),
                    subtitle: 'tokens ${chapter.tokens}',
                  );
                },
              ),
      ),
      body: result == null
          ? const Center(child: Text('No results yet.'))
          : ListView.builder(
              padding: const EdgeInsets.all(24),
              itemCount: result.chapters.length,
              itemBuilder: (context, index) {
                final chapter = result.chapters[index];
                final title = _formatChapterTitle(chapter.chapterId);
                return _AnalysisCard(
                  title: title,
                  subtitle:
                      'Agent ${chapter.agent} · tokens ${chapter.tokens}',
                  content: MarkdownViewer(content: chapter.content),
                );
              },
            ),
      bottomBar: Container(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
        decoration: const BoxDecoration(
          color: AppColors.bgPrimary,
          border: Border(
            top: BorderSide(color: AppColors.border),
          ),
        ),
        child: Align(
          alignment: Alignment.centerRight,
          child: PrimaryButton(
            label: '导出',
            icon: Icons.download,
            onPressed: () => context.push('/business-plan/export'),
          ),
        ),
      ),
    );
  }

  String _formatChapterTitle(String raw) {
    if (raw.isEmpty) return '章节';
    final label = raw.replaceAll('_', ' ');
    return label
        .split(' ')
        .map((word) =>
            word.isEmpty ? word : '${word[0].toUpperCase()}${word.substring(1)}')
        .join(' ');
  }
}

class _SidebarChapterItem extends StatelessWidget {
  const _SidebarChapterItem({
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
          Icon(Icons.article_outlined,
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

class _AnalysisCard extends StatelessWidget {
  const _AnalysisCard({
    required this.title,
    required this.subtitle,
    required this.content,
  });

  final String title;
  final String subtitle;
  final Widget content;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: AppColors.bgSecondary,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary,
                ),
          ),
          const SizedBox(height: 6),
          Text(
            subtitle,
            style: Theme.of(context)
                .textTheme
                .bodySmall
                ?.copyWith(color: AppColors.textSecondary),
          ),
          const SizedBox(height: 8),
          content,
        ],
      ),
    );
  }
}
