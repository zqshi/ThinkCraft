import '../../core/api/api_client.dart';
import '../../domain/agent/models/agent.dart';
import '../../domain/agent/repositories/agent_repository.dart';

class AgentRepositoryImpl implements AgentRepository {
  AgentRepositoryImpl(this._apiClient);

  final ApiClient _apiClient;

  @override
  Future<List<Agent>> getUserAgents(String userId) async {
    // TODO: Implement API integration for /api/agents/my/:userId
    return [];
  }

  @override
  Future<Agent?> getAgentById(String agentId) async {
    // TODO: Implement API integration for /api/agents/:userId/:agentId
    return null;
  }

  @override
  Future<Agent> saveAgent(Agent agent) async {
    // TODO: Implement API integration for /api/agents/hire
    return agent;
  }

  @override
  Future<void> deleteAgent(String agentId, String userId) async {
    // TODO: Implement API integration for /api/agents/:userId/:agentId
  }
}
