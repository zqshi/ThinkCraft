import '../../domain/collaboration/models/collaboration_execution.dart';
import '../../domain/collaboration/repositories/collaboration_repository.dart';

class ExecuteCollaborationUseCase {
  ExecuteCollaborationUseCase(this._repository);

  final CollaborationRepository _repository;

  Future<CollaborationExecutionResult> execute({
    required String planId,
    String mode = 'workflow',
  }) {
    return _repository.executePlan(planId, mode);
  }
}
