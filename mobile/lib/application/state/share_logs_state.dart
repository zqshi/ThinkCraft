import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/share/models/share_access_log.dart';
import 'providers.dart';

final shareLogsProvider = FutureProvider.family<List<ShareAccessLog>, String>((ref, shareId) {
  final repository = ref.read(shareRepositoryProvider);
  return repository.getAccessLogs(shareId);
});
