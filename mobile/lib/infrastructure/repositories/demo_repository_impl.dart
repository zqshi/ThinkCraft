import '../../core/api/api_client.dart';
import '../../domain/demo/models/demo.dart';
import '../../domain/demo/repositories/demo_repository.dart';

class DemoRepositoryImpl implements DemoRepository {
  DemoRepositoryImpl(this._apiClient);

  final ApiClient _apiClient;

  @override
  Future<Demo> generateDemo(
    DemoType type,
    List<Map<String, dynamic>> conversationHistory,
    List<String> features,
  ) async {
    final apiDemoType = _mapDemoType(type);
    final response = await _apiClient.dio.post('/demo-generator/generate', data: {
      'demoType': apiDemoType,
      'conversationHistory': conversationHistory,
      'features': features,
    });
    final data = response.data['data'] as Map<String, dynamic>;
    return Demo(
      id: data['demoId']?.toString() ?? '',
      type: type,
      code: '',
      createdAt: DateTime.now(),
      downloadUrl: data['downloadUrl']?.toString(),
    );
  }

  @override
  Future<Demo?> getDemo(String demoId) async {
    final response = await _apiClient.dio.get('/demo-generator/$demoId');
    final data = response.data['data'] as Map<String, dynamic>?;
    if (data == null) return null;
    final demoType = _mapApiDemoType(data['demoType']?.toString());
    return Demo(
      id: data['demoId']?.toString() ?? demoId,
      type: demoType,
      code: '',
      createdAt: DateTime.tryParse(data['createdAt']?.toString() ?? '') ??
          DateTime.now(),
      downloadUrl: data['downloadUrl']?.toString(),
    );
  }

  String _mapDemoType(DemoType type) {
    switch (type) {
      case DemoType.landingPage:
        return 'web';
      case DemoType.dashboard:
        return 'admin';
      case DemoType.mobileApp:
        return 'app';
    }
  }

  DemoType _mapApiDemoType(String? type) {
    switch (type) {
      case 'admin':
        return DemoType.dashboard;
      case 'app':
        return DemoType.mobileApp;
      case 'web':
      default:
        return DemoType.landingPage;
    }
  }
}
