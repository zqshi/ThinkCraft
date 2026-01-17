import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/share/models/share_link.dart';
import 'providers.dart';

final shareListProvider = FutureProvider.family<List<ShareLink>, String>((ref, userId) {
  final repository = ref.read(shareRepositoryProvider);
  return repository.getUserShares(userId);
});
