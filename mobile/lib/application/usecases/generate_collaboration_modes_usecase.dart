import '../../domain/collaboration/models/collaboration_modes.dart';
import '../../domain/collaboration/repositories/collaboration_repository.dart';

class GenerateCollaborationModesUseCase {
  GenerateCollaborationModesUseCase(this._repository);

  final CollaborationRepository _repository;

  Future<CollaborationModes> execute({required String planId}) {
    return _repository.generateModes(planId);
  }
}
