import '../models/demo.dart';

class DemoService {
  Demo create({
    required DemoType type,
  }) {
    return Demo(
      id: 'demo_${DateTime.now().millisecondsSinceEpoch}',
      type: type,
      code: '',
      createdAt: DateTime.now(),
      downloadUrl: null,
    );
  }
}
