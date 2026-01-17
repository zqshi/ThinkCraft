import '../../core/api/api_client.dart';
import '../../domain/business_plan/models/business_plan_batch_result.dart';
import '../../domain/business_plan/repositories/business_plan_repository.dart';

class BusinessPlanRepositoryImpl implements BusinessPlanRepository {
  BusinessPlanRepositoryImpl(this._apiClient);

  final ApiClient _apiClient;

  @override
  Future<BusinessPlanBatchResult> generateBatch(
    List<String> chapterIds,
    List<Map<String, dynamic>> conversationHistory,
  ) async {
    final response = await _apiClient.dio.post('/business-plan/generate-batch',
        data: {
          'chapterIds': chapterIds,
          'conversationHistory': conversationHistory,
        });
    final data = response.data['data'] as Map<String, dynamic>;
    return BusinessPlanBatchResult.fromJson(data);
  }
}
