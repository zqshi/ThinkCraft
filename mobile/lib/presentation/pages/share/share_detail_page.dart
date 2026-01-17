import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../application/state/share_access_state.dart';
import '../../../application/state/share_logs_state.dart';
import '../../widgets/business/markdown_viewer.dart';
import '../../widgets/layout/app_shell.dart';

class ShareDetailPage extends ConsumerStatefulWidget {
  const ShareDetailPage({super.key, required this.shareId});

  final String shareId;

  @override
  ConsumerState<ShareDetailPage> createState() => _ShareDetailPageState();
}

class _ShareDetailPageState extends ConsumerState<ShareDetailPage> {
  @override
  Widget build(BuildContext context) {
    final accessAsync = ref.watch(shareAccessProvider(widget.shareId));
    final logsAsync = ref.watch(shareLogsProvider(widget.shareId));

    return AppShell(
      title: 'ThinkCraft AI',
      sidebar: AppSidebar(
        content: logsAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (err, _) => Center(child: Text('Failed to load logs: $err')),
          data: (logs) {
            if (logs.isEmpty) {
              return const Center(child: Text('暂无访问记录'));
            }
            return ListView.separated(
              padding: const EdgeInsets.all(12),
              itemBuilder: (context, index) {
                final log = logs[index];
                return ListTile(
                  leading: const Icon(Icons.visibility_outlined, size: 18),
                  title: Text(log.ip),
                  subtitle: Text(log.userAgent),
                );
              },
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemCount: logs.length,
            );
          },
        ),
      ),
      body: accessAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Failed to access share: $err')),
        data: (access) => access == null
            ? const Center(child: Text('Share not found'))
            : _buildPayload(access.data),
      ),
    );
  }

  Widget _buildPayload(Map<String, dynamic> data) {
    if (data.isEmpty) {
      return const Center(child: Text('No payload data.'));
    }

    if (data.containsKey('title') || data.containsKey('content')) {
      return ListView(
        padding: const EdgeInsets.all(24),
        children: [
          if (data['title'] != null) Text(data['title'].toString()),
          const SizedBox(height: 8),
          if (data['content'] != null)
            MarkdownViewer(content: data['content'].toString()),
        ],
      );
    }

    if (data.containsKey('messages')) {
      final messages = data['messages'] as List<dynamic>? ?? [];
      return ListView.builder(
        padding: const EdgeInsets.all(24),
        itemCount: messages.length,
        itemBuilder: (context, index) {
          final message = messages[index] as Map<String, dynamic>? ?? {};
          return ListTile(
            title: Text(message['content']?.toString() ?? ''),
            subtitle: Text(message['role']?.toString() ?? ''),
          );
        },
      );
    }

    final entries = data.entries.toList();
    return ListView.builder(
      padding: const EdgeInsets.all(24),
      itemCount: entries.length,
      itemBuilder: (context, index) {
        final entry = entries[index];
        return ListTile(
          title: Text(entry.key),
          subtitle: Text(entry.value.toString()),
        );
      },
    );
  }
}
