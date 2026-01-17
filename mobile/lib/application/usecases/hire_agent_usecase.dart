import '../../domain/agent/models/agent.dart';
import '../../domain/agent/models/agent_type.dart';
import '../../domain/agent/repositories/agent_repository.dart';
import '../../domain/agent/services/agent_hire_service.dart';

class HireAgentUseCase {
  HireAgentUseCase(this._repository, this._hireService);

  final AgentRepository _repository;
  final AgentHireService _hireService;

  Future<Agent> execute({
    required String userId,
    required AgentType agentType,
    String? nickname,
  }) async {
    final agent = _hireService.hire(
      userId: userId,
      type: agentType,
      nickname: nickname,
    );

    return _repository.saveAgent(agent);
  }
}
