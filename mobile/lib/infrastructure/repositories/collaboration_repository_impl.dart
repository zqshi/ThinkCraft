import '../../core/api/api_client.dart';
import '../../domain/collaboration/models/collaboration_plan.dart';
import '../../domain/collaboration/models/collaboration_analysis.dart';
import '../../domain/collaboration/models/collaboration_execution.dart';
import '../../domain/collaboration/models/collaboration_modes.dart';
import '../../domain/collaboration/repositories/collaboration_repository.dart';

class CollaborationRepositoryImpl implements CollaborationRepository {
  CollaborationRepositoryImpl(this._apiClient);

  final ApiClient _apiClient;

  @override
  Future<CollaborationPlan> createPlan(String userId, String goal) async {
    final response = await _apiClient.dio.post('/collaboration/create', data: {
      'userId': userId,
      'goal': goal,
    });
    final data = response.data['data'] as Map<String, dynamic>;
    return CollaborationPlan.fromJson(data);
  }

  @override
  Future<CollaborationPlan?> getPlan(String planId) async {
    final response = await _apiClient.dio.get('/collaboration/$planId');
    final data = response.data['data'] as Map<String, dynamic>?;
    if (data == null) return null;
    return CollaborationPlan.fromJson(data);
  }

  @override
  Future<List<CollaborationPlan>> getUserPlans(String userId) async {
    final response = await _apiClient.dio.get('/collaboration/user/$userId');
    final list = response.data['data']['plans'] as List<dynamic>? ?? [];
    return list
        .map((item) => CollaborationPlan.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  @override
  Future<CollaborationAnalysis> analyzeCapability(String planId) async {
    final response = await _apiClient.dio.post(
      '/collaboration/analyze-capability',
      data: {'planId': planId},
    );
    final data = response.data['data'] as Map<String, dynamic>;
    return CollaborationAnalysis.fromJson(data);
  }

  @override
  Future<CollaborationModes> generateModes(String planId) async {
    final response = await _apiClient.dio.post(
      '/collaboration/generate-modes',
      data: {'planId': planId},
    );
    final data = response.data['data'] as Map<String, dynamic>;
    return CollaborationModes.fromJson(data);
  }

  @override
  Future<CollaborationExecutionResult> executePlan(
    String planId,
    String mode,
  ) async {
    final response = await _apiClient.dio.post(
      '/collaboration/execute',
      data: {'planId': planId, 'executionMode': mode},
    );
    final data = response.data['data'] as Map<String, dynamic>;
    return CollaborationExecutionResult.fromJson(planId, data);
  }
}
