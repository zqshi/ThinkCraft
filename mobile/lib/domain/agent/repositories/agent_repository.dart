import '../models/agent.dart';
import '../models/agent_type.dart';

abstract class AgentRepository {
  Future<List<Agent>> getUserAgents(String userId);
  Future<Agent?> getAgentById(String userId, String agentId);
  Future<Agent> saveAgent(Agent agent);
  Future<void> deleteAgent(String agentId, String userId);
  Future<List<AgentType>> getAgentTypes();
}
