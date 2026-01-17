class ShareAccessLog {
  ShareAccessLog({
    required this.id,
    required this.shareId,
    required this.ip,
    required this.userAgent,
    required this.accessedAt,
  });

  final String id;
  final String shareId;
  final String ip;
  final String userAgent;
  final DateTime accessedAt;

  factory ShareAccessLog.fromJson(Map<String, dynamic> json) {
    return ShareAccessLog(
      id: json['id']?.toString() ?? '',
      shareId: json['shareLinkId']?.toString() ?? json['shareId']?.toString() ?? '',
      ip: json['visitorIp']?.toString() ?? json['ipAddress']?.toString() ?? '',
      userAgent: json['userAgent']?.toString() ?? '',
      accessedAt: DateTime.tryParse(json['accessedAt']?.toString() ?? '') ??
          DateTime.now(),
    );
  }
}
