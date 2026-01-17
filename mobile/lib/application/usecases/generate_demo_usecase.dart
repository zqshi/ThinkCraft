import '../../domain/demo/models/demo.dart';
import '../../domain/demo/repositories/demo_repository.dart';
import '../../domain/demo/services/demo_service.dart';

class GenerateDemoUseCase {
  GenerateDemoUseCase(this._repository, this._service);

  final DemoRepository _repository;
  final DemoService _service;

  Future<Demo> execute({
    required DemoType type,
    required List<Map<String, dynamic>> conversationHistory,
    List<String> features = const [],
  }) async {
    final demo = _service.create(type: type);
    return _repository.generateDemo(demo.type, conversationHistory, features);
  }
}
