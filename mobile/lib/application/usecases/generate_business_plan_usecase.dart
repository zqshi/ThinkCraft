import '../../domain/business_plan/models/business_plan_batch_result.dart';
import '../../domain/business_plan/repositories/business_plan_repository.dart';

class GenerateBusinessPlanUseCase {
  GenerateBusinessPlanUseCase(this._repository);

  final BusinessPlanRepository _repository;

  Future<BusinessPlanBatchResult> execute({
    required List<String> chapterIds,
    required List<Map<String, dynamic>> conversationHistory,
  }) {
    return _repository.generateBatch(chapterIds, conversationHistory);
  }
}
