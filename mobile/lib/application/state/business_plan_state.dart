import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/business_plan/models/business_plan_batch_result.dart';
import 'providers.dart';

final businessPlanResultProvider = StateProvider<BusinessPlanBatchResult?>((ref) => null);

final businessPlanGenerateProvider = FutureProvider.family<BusinessPlanBatchResult, Map<String, dynamic>>((ref, args) {
  final useCase = ref.read(generateBusinessPlanUseCaseProvider);
  final chapterIds = args['chapterIds'] as List<String>;
  final history = args['conversationHistory'] as List<Map<String, dynamic>>;
  return useCase.execute(chapterIds: chapterIds, conversationHistory: history);
});
