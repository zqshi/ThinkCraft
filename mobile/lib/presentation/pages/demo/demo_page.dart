import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../application/state/demo_state.dart';
import '../../../domain/demo/models/demo.dart';
import '../../widgets/common/primary_button.dart';
import '../../widgets/common/text_input.dart';
import '../../widgets/layout/app_shell.dart';
import '../../themes/app_colors.dart';

class DemoPage extends ConsumerStatefulWidget {
  const DemoPage({super.key});

  @override
  ConsumerState<DemoPage> createState() => _DemoPageState();
}

class _DemoPageState extends ConsumerState<DemoPage> {
  final TextEditingController _promptController = TextEditingController();
  final TextEditingController _featuresController = TextEditingController();
  DemoType _type = DemoType.landingPage;
  String _status = '';

  @override
  void dispose() {
    _promptController.dispose();
    _featuresController.dispose();
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
              leading: Icon(Icons.auto_awesome, size: 18),
              title: Text('Demo 生成'),
              subtitle: Text('Landing / 产品原型'),
            ),
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
                DropdownButton<DemoType>(
                  value: _type,
                  onChanged: (value) {
                    if (value == null) return;
                    setState(() => _type = value);
                  },
                  items: DemoType.values
                      .map((type) => DropdownMenuItem(
                            value: type,
                            child: Text(type.name),
                          ))
                      .toList(),
                ),
                const SizedBox(height: 12),
                TextInput(
                  controller: _promptController,
                  label: '输入对话摘要',
                  maxLines: 3,
                ),
                const SizedBox(height: 12),
                TextInput(
                  controller: _featuresController,
                  label: '功能点（逗号分隔）',
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    PrimaryButton(
                      label: '生成',
                      onPressed: () async {
                        final prompt = _promptController.text.trim();
                        if (prompt.isEmpty) return;
                        final features = _featuresController.text
                            .split(',')
                            .map((item) => item.trim())
                            .where((item) => item.isNotEmpty)
                            .toList();
                        final demo = await ref.read(
                          demoGenerateProvider({
                            'type': _type,
                            'conversationHistory': [
                              {'role': 'user', 'content': prompt},
                            ],
                            'features': features,
                          }).future,
                        );
                        ref.read(demoResultProvider.notifier).state = demo;
                        setState(() {
                          _status = '生成 demo: ${demo.id}';
                        });
                        if (context.mounted) {
                          context.push('/demo/detail');
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
