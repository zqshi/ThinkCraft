import '../../domain/collaboration/models/collaboration_plan.dart';
import '../../domain/collaboration/repositories/collaboration_repository.dart';
import '../../domain/collaboration/services/collaboration_service.dart';

class CreateCollaborationPlanUseCase {
  CreateCollaborationPlanUseCase(this._repository, this._service);

  final CollaborationRepository _repository;
  final CollaborationService _service;

  Future<CollaborationPlan> execute({
    required String userId,
    required String goal,
  }) async {
    final plan = _service.create(userId: userId, goal: goal);
    return _repository.createPlan(plan.userId, plan.goal);
  }
}
