import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/demo/models/demo.dart';
import 'providers.dart';

final demoResultProvider = StateProvider<Demo?>((ref) => null);

final demoGenerateProvider = FutureProvider.family<Demo, Map<String, dynamic>>((ref, args) {
  final useCase = ref.read(generateDemoUseCaseProvider);
  return useCase.execute(
    type: args['type'] as DemoType,
    conversationHistory: args['conversationHistory'] as List<Map<String, dynamic>>,
    features: args['features'] as List<String>,
  );
});
