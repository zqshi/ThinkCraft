import '../../domain/pdf_export/models/pdf_export.dart';
import '../../domain/pdf_export/repositories/pdf_export_repository.dart';

class ExportPdfUseCase {
  ExportPdfUseCase(this._repository);

  final PdfExportRepository _repository;

  Future<PdfExportResult> execute({
    required String title,
    required List<Map<String, dynamic>> chapters,
  }) {
    return _repository.exportPdf(title, chapters);
  }
}
