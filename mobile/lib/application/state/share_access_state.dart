import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/share/models/share_access.dart';
import 'providers.dart';

final shareAccessProvider = FutureProvider.family<ShareAccess?, String>((ref, shareId) {
  final repository = ref.read(shareRepositoryProvider);
  return repository.accessShare(shareId);
});
