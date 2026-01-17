import '../models/report.dart';

abstract class ReportRepository {
  Future<Report> generateReport(String conversationId, String userId);
  Future<Report?> getReport(String reportId);
  Future<List<Report>> getUserReports(String userId);
  Future<void> updateReportStatus(String reportId, String status);
  Future<void> updateReportData(String reportId, Map<String, dynamic> data);
  Future<Report> regenerateReport(String reportId, List<Map<String, dynamic>> messages);
}
