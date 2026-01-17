import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../application/state/agent_state.dart';
import '../../../application/state/providers.dart';
import '../../../application/state/session_state.dart';
import '../../widgets/common/primary_button.dart';
import '../../widgets/layout/app_shell.dart';
import '../../widgets/modals/agent_market_modal.dart';
import '../../themes/app_colors.dart';

class AgentPage extends ConsumerWidget {
  const AgentPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final userId = ref.watch(currentUserIdProvider);
    final agentsAsync = ref.watch(agentListProvider(userId));
    final typesAsync = ref.watch(agentTypesProvider);

    return AppShell(
      title: 'ThinkCraft AI',
      sidebar: AppSidebar(
        content: typesAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (err, _) => Center(child: Text('Failed to load types: $err')),
          data: (types) {
            if (types.isEmpty) {
              return const Center(child: Text('暂无可雇佣类型'));
            }
            return ListView.separated(
              padding: const EdgeInsets.all(12),
              itemBuilder: (context, index) {
                final type = types[index];
                return ListTile(
                  leading: Text(type.emoji),
                  title: Text(type.name),
                  subtitle: Text(type.desc),
                );
              },
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemCount: types.length,
            );
          },
        ),
      ),
      body: agentsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Failed to load agents: $err')),
        data: (agents) => typesAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (err, _) => Center(child: Text('Failed to load types: $err')),
          data: (types) => ListView(
            padding: const EdgeInsets.all(24),
            children: [
              Align(
                alignment: Alignment.centerRight,
                child: OutlinedButton(
                  onPressed: () => AgentMarketModal.show(context),
                  child: const Text('打开员工市场'),
                ),
              ),
              const SizedBox(height: 12),
              const _SectionTitle(title: '雇佣市场'),
              const SizedBox(height: 8),
              ...types.map((type) => _ListCard(
                    child: Row(
                      children: [
                        Text(type.emoji, style: const TextStyle(fontSize: 24)),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                type.name,
                                style: Theme.of(context)
                                    .textTheme
                                    .bodyLarge
                                    ?.copyWith(fontWeight: FontWeight.w600),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                type.desc,
                                style: Theme.of(context)
                                    .textTheme
                                    .bodySmall
                                    ?.copyWith(color: AppColors.textSecondary),
                              ),
                            ],
                          ),
                        ),
                        PrimaryButton(
                          label: '雇佣',
                          onPressed: () async {
                            final useCase = ref.read(hireAgentUseCaseProvider);
                            await useCase.execute(
                              userId: userId,
                              agentType: type,
                            );
                            ref.invalidate(agentListProvider(userId));
                          },
                        ),
                      ],
                    ),
                  )),
              const SizedBox(height: 16),
              const _SectionTitle(title: '我的员工'),
              const SizedBox(height: 8),
              if (agents.isEmpty)
                const Text('暂无员工'),
              ...agents.map((agent) => _ListCard(
                    child: Row(
                      children: [
                        const Icon(Icons.person_outline),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                agent.nickname ?? agent.name,
                                style: Theme.of(context)
                                    .textTheme
                                    .bodyLarge
                                    ?.copyWith(fontWeight: FontWeight.w600),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                agent.type.name,
                                style: Theme.of(context)
                                    .textTheme
                                    .bodySmall
                                    ?.copyWith(color: AppColors.textSecondary),
                              ),
                            ],
                          ),
                        ),
                        Text(agent.status.name),
                      ],
                    ),
                  )),
            ],
          ),
        ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Text(
      title,
      style: Theme.of(context)
          .textTheme
          .titleSmall
          ?.copyWith(fontWeight: FontWeight.w600),
    );
  }
}

class _ListCard extends StatelessWidget {
  const _ListCard({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: child,
    );
  }
}
