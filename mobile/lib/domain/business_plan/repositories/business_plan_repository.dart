import '../models/business_plan_batch_result.dart';

abstract class BusinessPlanRepository {
  Future<BusinessPlanBatchResult> generateBatch(
    List<String> chapterIds,
    List<Map<String, dynamic>> conversationHistory,
  );
}
