import '../../domain/report/models/report.dart';
import '../../domain/report/repositories/report_repository.dart';
import '../../domain/report/services/report_service.dart';

class GenerateReportUseCase {
  GenerateReportUseCase(this._repository, this._service);

  final ReportRepository _repository;
  final ReportService _service;

  Future<Report> execute({
    required String conversationId,
    required String userId,
  }) async {
    final report = _service.create(
      conversationId: conversationId,
      userId: userId,
    );
    return _repository.generateReport(report.conversationId, report.userId);
  }
}
