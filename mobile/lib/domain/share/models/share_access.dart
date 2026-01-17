class ShareAccess {
  ShareAccess({
    required this.shareId,
    required this.payload,
  });

  final String shareId;
  final Map<String, dynamic> payload;

  factory ShareAccess.fromJson(String shareId, Map<String, dynamic> json) {
    return ShareAccess(
      shareId: shareId,
      payload: json,
    );
  }

  Map<String, dynamic> get data {
    final payload = this.payload;
    if (payload.containsKey('data') && payload['data'] is Map<String, dynamic>) {
      return payload['data'] as Map<String, dynamic>;
    }
    return payload;
  }
}
