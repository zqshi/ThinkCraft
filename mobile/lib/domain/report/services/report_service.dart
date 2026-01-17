import '../models/report.dart';

class ReportService {
  Report create({
    required String conversationId,
    required String userId,
  }) {
    return Report(
      id: 'report_${DateTime.now().millisecondsSinceEpoch}',
      conversationId: conversationId,
      userId: userId,
      status: ReportStatus.draft,
      createdAt: DateTime.now(),
    );
  }
}
