import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../application/state/agent_state.dart';
import '../../../application/state/providers.dart';
import '../../../application/state/session_state.dart';
import '../../themes/app_colors.dart';

class AgentMarketModal {
  static Future<void> show(BuildContext context) {
    return showDialog(
      context: context,
      barrierDismissible: true,
      builder: (context) => const _AgentMarketDialog(),
    );
  }
}

class _AgentMarketDialog extends ConsumerStatefulWidget {
  const _AgentMarketDialog();

  @override
  ConsumerState<_AgentMarketDialog> createState() => _AgentMarketDialogState();
}

class _AgentMarketDialogState extends ConsumerState<_AgentMarketDialog> {
  _AgentMarketTab _activeTab = _AgentMarketTab.market;

  @override
  Widget build(BuildContext context) {
    return Dialog(
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 820, maxHeight: 640),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(
                    '🏪 数字员工市场',
                    style: Theme.of(context)
                        .textTheme
                        .titleMedium
                        ?.copyWith(fontWeight: FontWeight.w600),
                  ),
                  const Spacer(),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              const Divider(height: 1, color: AppColors.border),
              const SizedBox(height: 12),
              Row(
                children: [
                  _TabChip(
                    label: '可雇佣',
                    isActive: _activeTab == _AgentMarketTab.market,
                    onTap: () => setState(() => _activeTab = _AgentMarketTab.market),
                  ),
                  const SizedBox(width: 8),
                  _TabChip(
                    label: '已雇佣',
                    isActive: _activeTab == _AgentMarketTab.hired,
                    onTap: () => setState(() => _activeTab = _AgentMarketTab.hired),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Expanded(
                child: _activeTab == _AgentMarketTab.market
                    ? _buildMarketTab(context)
                    : _buildHiredTab(context),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMarketTab(BuildContext context) {
    final userId = ref.watch(currentUserIdProvider);
    final typesAsync = ref.watch(agentTypesProvider);
    final agentsAsync = ref.watch(agentListProvider(userId));

    return typesAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (err, _) => Center(child: Text('Failed to load types: $err')),
      data: (types) => agentsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Failed to load agents: $err')),
        data: (agents) {
          if (types.isEmpty) {
            return const Center(child: Text('暂无可雇佣类型'));
          }
          return GridView.count(
            crossAxisCount: 2,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 1.6,
            children: types.map((type) {
              final isHired =
                  agents.any((agent) => agent.type.id == type.id);
              return Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${type.emoji} ${type.name}',
                      style: Theme.of(context)
                          .textTheme
                          .bodyMedium
                          ?.copyWith(fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      type.desc,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context)
                          .textTheme
                          .bodySmall
                          ?.copyWith(color: AppColors.textSecondary),
                    ),
                    const Spacer(),
                    Align(
                      alignment: Alignment.centerRight,
                      child: ElevatedButton(
                        onPressed: isHired
                            ? null
                            : () async {
                                final useCase =
                                    ref.read(hireAgentUseCaseProvider);
                                await useCase.execute(
                                  userId: userId,
                                  agentType: type,
                                );
                                ref.invalidate(agentListProvider(userId));
                              },
                        child: Text(isHired ? '已雇佣' : '雇佣'),
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          );
        },
      ),
    );
  }

  Widget _buildHiredTab(BuildContext context) {
    final userId = ref.watch(currentUserIdProvider);
    final agentsAsync = ref.watch(agentListProvider(userId));

    return agentsAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (err, _) => Center(child: Text('Failed to load agents: $err')),
      data: (agents) {
        if (agents.isEmpty) {
          return const Center(child: Text('暂无已雇佣员工'));
        }
        return ListView.separated(
          itemBuilder: (context, index) {
            final agent = agents[index];
            return ListTile(
              leading: Text(agent.type.emoji),
              title: Text(agent.nickname ?? agent.name),
              subtitle: Text(agent.type.name),
              trailing: Text(agent.status.name),
            );
          },
          separatorBuilder: (_, __) => const Divider(height: 1),
          itemCount: agents.length,
        );
      },
    );
  }
}

class _TabChip extends StatelessWidget {
  const _TabChip({
    required this.label,
    this.isActive = false,
    this.onTap,
  });

  final String label;
  final bool isActive;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final color =
        isActive ? Theme.of(context).colorScheme.primary : AppColors.textSecondary;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: isActive ? AppColors.bgPrimary : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isActive ? AppColors.border : Colors.transparent,
          ),
        ),
        child: Text(
          label,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: isActive ? color : AppColors.textSecondary,
                fontWeight: isActive ? FontWeight.w600 : FontWeight.w500,
              ),
        ),
      ),
    );
  }
}

enum _AgentMarketTab { market, hired }
