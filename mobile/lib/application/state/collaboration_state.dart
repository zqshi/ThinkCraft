import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/collaboration/models/collaboration_plan.dart';
import 'providers.dart';

final collaborationPlansProvider = FutureProvider.family<List<CollaborationPlan>, String>((ref, userId) {
  final repository = ref.read(collaborationRepositoryProvider);
  return repository.getUserPlans(userId);
});
