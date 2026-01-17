import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../application/state/demo_state.dart';
import '../../widgets/download_link.dart';
import '../../widgets/common/primary_button.dart';
import '../../widgets/layout/app_shell.dart';

class DemoDetailPage extends ConsumerStatefulWidget {
  const DemoDetailPage({super.key});

  @override
  ConsumerState<DemoDetailPage> createState() => _DemoDetailPageState();
}

class _DemoDetailPageState extends ConsumerState<DemoDetailPage> {
  @override
  Widget build(BuildContext context) {
    final demo = ref.watch(demoResultProvider);
    final status = demo == null ? 'No demo yet.' : 'Demo generated: ${demo.id}';
    return AppShell(
      title: 'ThinkCraft AI',
      sidebar: AppSidebar(
        content: ListView(
          padding: const EdgeInsets.all(12),
          children: const [
            ListTile(
              leading: Icon(Icons.auto_awesome, size: 18),
              title: Text('Demo 结果'),
              subtitle: Text('下载与预览'),
            ),
          ],
        ),
      ),
      body: Center(
        child: demo == null
            ? Text(status)
            : Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(status),
                  const SizedBox(height: 12),
                  DownloadLink(
                    label: '下载 Demo',
                    url: demo.downloadUrl ?? '/api/demo/download/${demo.id}',
                  ),
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
