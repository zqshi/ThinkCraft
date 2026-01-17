import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/report/models/report.dart';
import 'providers.dart';

final reportDetailProvider = FutureProvider.family<Report?, String>((ref, reportId) {
  final repository = ref.read(reportRepositoryProvider);
  return repository.getReport(reportId);
});
