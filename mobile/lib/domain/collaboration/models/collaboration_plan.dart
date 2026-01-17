enum CollaborationStatus { draft, planned, executing, completed }

class CollaborationPlan {
  CollaborationPlan({
    required this.id,
    required this.userId,
    required this.goal,
    required this.status,
    required this.createdAt,
  });

  final String id;
  final String userId;
  final String goal;
  final CollaborationStatus status;
  final DateTime createdAt;

  factory CollaborationPlan.fromJson(Map<String, dynamic> json) {
    return CollaborationPlan(
      id: json['id']?.toString() ?? json['planId']?.toString() ?? '',
      userId: json['userId']?.toString() ?? '',
      goal: json['goal']?.toString() ?? '',
      status: _parseStatus(json['status']),
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ??
          DateTime.now(),
    );
  }

  static CollaborationStatus _parseStatus(dynamic value) {
    switch (value) {
      case 'planned':
        return CollaborationStatus.planned;
      case 'executing':
        return CollaborationStatus.executing;
      case 'completed':
        return CollaborationStatus.completed;
      case 'draft':
      default:
        return CollaborationStatus.draft;
    }
  }
}
