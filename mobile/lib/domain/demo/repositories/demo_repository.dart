import '../models/demo.dart';

abstract class DemoRepository {
  Future<Demo> generateDemo(
    DemoType type,
    List<Map<String, dynamic>> conversationHistory,
    List<String> features,
  );
  Future<Demo?> getDemo(String demoId);
}
