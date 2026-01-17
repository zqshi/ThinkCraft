import '../models/collaboration_plan.dart';

class CollaborationService {
  CollaborationPlan create({
    required String userId,
    required String goal,
  }) {
    return CollaborationPlan(
      id: 'collab_${DateTime.now().millisecondsSinceEpoch}',
      userId: userId,
      goal: goal,
      status: CollaborationStatus.draft,
      createdAt: DateTime.now(),
    );
  }
}
