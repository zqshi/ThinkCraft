import 'agent_type.dart';

enum AgentStatus { idle, working, offline }

class Agent {
  Agent({
    required this.id,
    required this.userId,
    required this.type,
    required this.name,
    this.nickname,
    this.status = AgentStatus.idle,
    this.performance = 80,
    this.tasksCompleted = 0,
    this.tasksFailed = 0,
    this.hiredAt,
    this.firedAt,
    this.lastActiveAt,
  });

  final String id;
  final String userId;
  final AgentType type;
  final String name;
  String? nickname;
  AgentStatus status;
  double performance;
  int tasksCompleted;
  int tasksFailed;
  DateTime? hiredAt;
  DateTime? firedAt;
  DateTime? lastActiveAt;

  bool get isFired => firedAt != null;
  bool canAcceptTask() => status == AgentStatus.idle && !isFired;
}
