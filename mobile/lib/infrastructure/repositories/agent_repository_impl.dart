import '../../core/api/api_client.dart';
import '../../domain/agent/models/agent.dart';
import '../../domain/agent/models/agent_type.dart';
import '../../domain/agent/repositories/agent_repository.dart';

class AgentRepositoryImpl implements AgentRepository {
  AgentRepositoryImpl(this._apiClient);

  final ApiClient _apiClient;

  @override
  Future<List<Agent>> getUserAgents(String userId) async {
    final response = await _apiClient.dio.get('/agents/my/$userId');
    final data = response.data['data'] ?? {};
    final agents = (data['agents'] as List<dynamic>? ?? [])
        .map((json) => Agent.fromJson(json as Map<String, dynamic>))
        .toList();
    return agents;
  }

  @override
  Future<Agent?> getAgentById(String userId, String agentId) async {
    final agents = await getUserAgents(userId);
    try {
      return agents.firstWhere((agent) => agent.id == agentId);
    } catch (_) {
      return null;
    }
  }

  @override
  Future<Agent> saveAgent(Agent agent) async {
    final response = await _apiClient.dio.post('/agents/hire', data: {
      'userId': agent.userId,
      'agentType': agent.type.id,
      'nickname': agent.nickname,
    });
    final data = response.data['data'] as Map<String, dynamic>;
    return Agent.fromJson(data);
  }

  @override
  Future<void> deleteAgent(String agentId, String userId) async {
    await _apiClient.dio.delete('/agents/$userId/$agentId');
  }

  @override
  Future<List<AgentType>> getAgentTypes() async {
    final response = await _apiClient.dio.get('/agents/types');
    final data = response.data['data'] ?? {};
    final types = (data['types'] as List<dynamic>? ?? [])
        .map((json) => AgentType.fromJson(json as Map<String, dynamic>))
        .toList();
    return types;
  }
}
