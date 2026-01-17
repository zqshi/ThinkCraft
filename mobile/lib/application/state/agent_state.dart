import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/agent/models/agent.dart';
import '../../domain/agent/models/agent_type.dart';
import 'providers.dart';

final agentListProvider = FutureProvider.family<List<Agent>, String>((ref, userId) {
  final repository = ref.read(agentRepositoryProvider);
  return repository.getUserAgents(userId);
});

final agentTypesProvider = FutureProvider<List<AgentType>>((ref) {
  final repository = ref.read(agentRepositoryProvider);
  return repository.getAgentTypes();
});
