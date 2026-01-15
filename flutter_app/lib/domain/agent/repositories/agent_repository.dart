import '../models/agent.dart';

abstract class AgentRepository {
  Future<List<Agent>> getUserAgents(String userId);
  Future<Agent?> getAgentById(String agentId);
  Future<Agent> saveAgent(Agent agent);
  Future<void> deleteAgent(String agentId, String userId);
}
