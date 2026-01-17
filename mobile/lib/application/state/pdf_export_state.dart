import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/pdf_export/models/pdf_export.dart';
import 'providers.dart';

final pdfExportResultProvider = StateProvider<PdfExportResult?>((ref) => null);

final pdfExportProvider = FutureProvider.family<PdfExportResult, Map<String, dynamic>>((ref, args) {
  final useCase = ref.read(exportPdfUseCaseProvider);
  return useCase.execute(
    title: args['title'] as String,
    chapters: args['chapters'] as List<Map<String, dynamic>>,
  );
});
