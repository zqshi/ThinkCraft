import '../models/share_link.dart';
import '../models/share_access.dart';
import '../models/share_access_log.dart';

abstract class ShareRepository {
  Future<ShareLink> createShare(String userId, ShareType type, Map<String, dynamic> data,
      {String? title});
  Future<ShareLink?> getShare(String shareId);
  Future<List<ShareLink>> getUserShares(String userId);
  Future<List<ShareAccessLog>> getAccessLogs(String shareId);
  Future<ShareAccess?> accessShare(String shareId);
}
