import '../models/share_link.dart';

class ShareService {
  ShareLink create({
    required ShareType type,
    required Map<String, dynamic> data,
    String? title,
  }) {
    return ShareLink(
      id: 'share_${DateTime.now().millisecondsSinceEpoch}',
      type: type,
      data: data,
      title: title,
      createdAt: DateTime.now(),
    );
  }
}
