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

  factory Agent.fromJson(Map<String, dynamic> json) {
    return Agent(
      id: json['id']?.toString() ?? '',
      userId: json['userId']?.toString() ?? '',
      type: AgentType.fromJson(json),
      name: json['name']?.toString() ?? '',
      nickname: json['nickname']?.toString(),
      status: _parseStatus(json['status']),
      performance: (json['performance'] is num)
          ? (json['performance'] as num).toDouble()
          : 0,
      tasksCompleted: (json['tasksCompleted'] is int)
          ? json['tasksCompleted'] as int
          : 0,
      tasksFailed: (json['tasksFailed'] is int) ? json['tasksFailed'] as int : 0,
      hiredAt: _parseDate(json['hiredAt']),
      firedAt: _parseDate(json['firedAt']),
      lastActiveAt: _parseDate(json['lastActiveAt']),
    );
  }

  static AgentStatus _parseStatus(dynamic value) {
    switch (value) {
      case 'working':
        return AgentStatus.working;
      case 'offline':
        return AgentStatus.offline;
      case 'idle':
      default:
        return AgentStatus.idle;
    }
  }

  static DateTime? _parseDate(dynamic value) {
    if (value == null) return null;
    return DateTime.tryParse(value.toString());
  }
}
