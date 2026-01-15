import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/agent/models/agent.dart';
import '../../domain/agent/repositories/agent_repository.dart';
import '../usecases/hire_agent_usecase.dart';
import '../../infrastructure/di/injection.dart';

final agentRepositoryProvider = Provider<AgentRepository>((ref) => getIt<AgentRepository>());
final hireAgentUseCaseProvider = Provider<HireAgentUseCase>((ref) => getIt<HireAgentUseCase>());

final agentListProvider = FutureProvider.family<List<Agent>, String>((ref, userId) {
  final repository = ref.read(agentRepositoryProvider);
  return repository.getUserAgents(userId);
});
