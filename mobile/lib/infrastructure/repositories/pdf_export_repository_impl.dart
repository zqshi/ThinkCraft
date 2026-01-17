import '../../core/api/api_client.dart';
import '../../domain/pdf_export/models/pdf_export.dart';
import '../../domain/pdf_export/repositories/pdf_export_repository.dart';

class PdfExportRepositoryImpl implements PdfExportRepository {
  PdfExportRepositoryImpl(this._apiClient);

  final ApiClient _apiClient;

  @override
  Future<PdfExportResult> exportPdf(
    String title,
    List<Map<String, dynamic>> chapters,
  ) async {
    final response = await _apiClient.dio.post('/pdf-export/export', data: {
      'title': title,
      'chapters': chapters,
    });
    final data = response.data['data'] as Map<String, dynamic>;
    return PdfExportResult(
      filename: data['filename']?.toString() ?? 'report.pdf',
      downloadUrl: data['downloadUrl']?.toString() ?? '',
    );
  }
}
