import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/report/models/report.dart';
import 'providers.dart';

final reportListProvider = FutureProvider.family<List<Report>, String>((ref, userId) {
  final repository = ref.read(reportRepositoryProvider);
  return repository.getUserReports(userId);
});
