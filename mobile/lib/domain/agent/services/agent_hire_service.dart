import '../models/agent.dart';
import '../models/agent_type.dart';

class AgentHireService {
  Agent hire({
    required String userId,
    required AgentType type,
    String? nickname,
  }) {
    final now = DateTime.now();
    final id = '${userId}_${type.id}_${now.millisecondsSinceEpoch}';

    return Agent(
      id: id,
      userId: userId,
      type: type,
      name: type.name,
      nickname: nickname,
      hiredAt: now,
      lastActiveAt: now,
    );
  }
}
