import '../models/pdf_export.dart';

class PdfExportService {
  PdfExportResult create({
    required String filename,
    required String downloadUrl,
  }) {
    return PdfExportResult(
      filename: filename,
      downloadUrl: downloadUrl,
    );
  }
}
