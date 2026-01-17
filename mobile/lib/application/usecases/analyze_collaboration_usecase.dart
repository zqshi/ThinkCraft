import '../../domain/collaboration/models/collaboration_analysis.dart';
import '../../domain/collaboration/repositories/collaboration_repository.dart';

class AnalyzeCollaborationUseCase {
  AnalyzeCollaborationUseCase(this._repository);

  final CollaborationRepository _repository;

  Future<CollaborationAnalysis> execute({
    required String planId,
  }) {
    return _repository.analyzeCapability(planId);
  }
}
