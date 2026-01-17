enum ReportStatus { draft, finalStatus, archived }

class Report {
  Report({
    required this.id,
    required this.conversationId,
    required this.userId,
    required this.status,
    required this.createdAt,
    this.data = const {},
  });

  final String id;
  final String conversationId;
  final String userId;
  final ReportStatus status;
  final DateTime createdAt;
  final Map<String, dynamic> data;

  factory Report.fromJson(Map<String, dynamic> json) {
    final data = (json['reportData'] as Map<String, dynamic>? ?? const {});
    return Report(
      id: json['id']?.toString() ?? '',
      conversationId: json['conversationId']?.toString() ?? '',
      userId: json['userId']?.toString() ?? '',
      status: _parseStatus(json['status']),
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ??
          DateTime.now(),
      data: data,
    );
  }

  static ReportStatus _parseStatus(dynamic value) {
    switch (value) {
      case 'final':
        return ReportStatus.finalStatus;
      case 'archived':
        return ReportStatus.archived;
      case 'draft':
      default:
        return ReportStatus.draft;
    }
  }
}
