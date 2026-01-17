import '../models/pdf_export.dart';

abstract class PdfExportRepository {
  Future<PdfExportResult> exportPdf(
    String title,
    List<Map<String, dynamic>> chapters,
  );
}
