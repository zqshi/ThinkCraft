import '../../core/api/api_client.dart';
import '../../domain/share/models/share_access.dart';
import '../../domain/share/models/share_access_log.dart';
import '../../domain/share/models/share_link.dart';
import '../../domain/share/repositories/share_repository.dart';

class ShareRepositoryImpl implements ShareRepository {
  ShareRepositoryImpl(this._apiClient);

  final ApiClient _apiClient;

  @override
  Future<ShareLink> createShare(
    String userId,
    ShareType type,
    Map<String, dynamic> data, {
    String? title,
  }) async {
    final response = await _apiClient.dio.post('/share/create', data: {
      'userId': userId,
      'type': type.name,
      'data': data,
      if (title != null) 'title': title,
    });
    final payload = response.data['data'] as Map<String, dynamic>;
    return ShareLink.fromJson(payload);
  }

  @override
  Future<ShareLink?> getShare(String shareId) async {
    final response = await _apiClient.dio.get('/share/$shareId');
    final data = response.data['data'] as Map<String, dynamic>?;
    if (data == null) return null;
    return ShareLink.fromJson(data);
  }

  @override
  Future<List<ShareLink>> getUserShares(String userId) async {
    final response = await _apiClient.dio.get('/share/user/$userId');
    final list = response.data['data'] as List<dynamic>? ?? [];
    return list
        .map((item) => ShareLink.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  @override
  Future<List<ShareAccessLog>> getAccessLogs(String shareId) async {
    final response = await _apiClient.dio.get('/share/$shareId/logs');
    final list = response.data['data'] as List<dynamic>? ?? [];
    return list
        .map((item) => ShareAccessLog.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  @override
  Future<ShareAccess?> accessShare(String shareId) async {
    final response = await _apiClient.dio.get('/share/$shareId');
    final data = response.data['data'] as Map<String, dynamic>?;
    if (data == null) return null;
    return ShareAccess.fromJson(shareId, data);
  }
}
