import '../../core/api/api_client.dart';
import '../../domain/report/models/report.dart';
import '../../domain/report/repositories/report_repository.dart';

class ReportRepositoryImpl implements ReportRepository {
  ReportRepositoryImpl(this._apiClient);

  final ApiClient _apiClient;

  @override
  Future<Report> generateReport(String conversationId, String userId) async {
    final response = await _apiClient.dio.post('/report/generate', data: {
      'conversationId': conversationId,
      'userId': userId,
    });
    final data = response.data['data'] as Map<String, dynamic>;
    final reportJson = (data['report'] as Map<String, dynamic>?) ?? data;
    return Report.fromJson(reportJson);
  }

  @override
  Future<Report?> getReport(String reportId) async {
    final response = await _apiClient.dio.get('/report/$reportId');
    final data = response.data['data'] as Map<String, dynamic>?;
    if (data == null) return null;
    return Report.fromJson(data);
  }

  @override
  Future<List<Report>> getUserReports(String userId) async {
    final response = await _apiClient.dio.get('/report/user/$userId');
    final list = response.data['data'] as List<dynamic>? ?? [];
    return list
        .map((item) => Report.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  @override
  Future<void> updateReportStatus(String reportId, String status) async {
    await _apiClient.dio.put('/report/$reportId/status', data: {
      'status': status,
    });
  }

  @override
  Future<void> updateReportData(String reportId, Map<String, dynamic> data) async {
    await _apiClient.dio.put('/report/$reportId/data', data: {
      'reportData': data,
    });
  }

  @override
  Future<Report> regenerateReport(
    String reportId,
    List<Map<String, dynamic>> messages,
  ) async {
    final response = await _apiClient.dio.post(
      '/report/$reportId/regenerate',
      data: {'messages': messages},
    );
    final data = response.data['data'] as Map<String, dynamic>;
    final reportJson = (data['report'] as Map<String, dynamic>?) ?? data;
    return Report.fromJson(reportJson);
  }
}
