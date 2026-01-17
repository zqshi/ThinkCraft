import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../application/state/pdf_export_state.dart';
import '../../widgets/download_link.dart';
import '../../widgets/common/primary_button.dart';
import '../../widgets/layout/app_shell.dart';

class PdfExportDetailPage extends ConsumerStatefulWidget {
  const PdfExportDetailPage({super.key});

  @override
  ConsumerState<PdfExportDetailPage> createState() => _PdfExportDetailPageState();
}

class _PdfExportDetailPageState extends ConsumerState<PdfExportDetailPage> {
  @override
  Widget build(BuildContext context) {
    final result = ref.watch(pdfExportResultProvider);
    final status = result == null ? 'No export yet.' : 'PDF ready.';
    return AppShell(
      title: 'ThinkCraft AI',
      sidebar: AppSidebar(
        content: ListView(
          padding: const EdgeInsets.all(12),
          children: const [
            ListTile(
              leading: Icon(Icons.picture_as_pdf_outlined, size: 18),
              title: Text('PDF 结果'),
              subtitle: Text('下载链接'),
            ),
          ],
        ),
      ),
      body: Center(
        child: result == null
            ? Text(status)
            : Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  DownloadLink(label: result.filename, url: result.downloadUrl),
                  const SizedBox(height: 12),
                  PrimaryButton(
                    label: '返回',
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
      ),
    );
  }
}
