import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../application/state/pdf_export_state.dart';
import '../../widgets/common/primary_button.dart';
import '../../widgets/common/text_input.dart';
import '../../widgets/layout/app_shell.dart';
import '../../themes/app_colors.dart';

class PdfExportPage extends ConsumerStatefulWidget {
  const PdfExportPage({super.key});

  @override
  ConsumerState<PdfExportPage> createState() => _PdfExportPageState();
}

class _PdfExportPageState extends ConsumerState<PdfExportPage> {
  final TextEditingController _titleController = TextEditingController();
  final TextEditingController _contentController = TextEditingController();
  String _status = '';

  @override
  void dispose() {
    _titleController.dispose();
    _contentController.dispose();
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
            ListTile(
              leading: Icon(Icons.picture_as_pdf_outlined, size: 18),
              title: Text('PDF 导出'),
              subtitle: Text('报告下载'),
            ),
          ],
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          _SectionCard(
            child: Column(
              children: [
                TextInput(
                  controller: _titleController,
                  label: '报告标题',
                ),
                const SizedBox(height: 12),
                TextInput(
                  controller: _contentController,
                  label: '报告内容',
                  maxLines: 4,
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    PrimaryButton(
                      label: '导出',
                      onPressed: () async {
                        final title = _titleController.text.trim();
                        final content = _contentController.text.trim();
                        if (title.isEmpty || content.isEmpty) return;
                        final result = await ref.read(
                          pdfExportProvider({
                            'title': title,
                            'chapters': [
                              {'title': title, 'content': content},
                            ],
                          }).future,
                        );
                        ref.read(pdfExportResultProvider.notifier).state = result;
                        setState(() {
                          _status = 'PDF: ${result.downloadUrl}';
                        });
                        if (context.mounted) {
                          context.push('/pdf-export/detail');
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
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: child,
    );
  }
}
