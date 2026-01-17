enum ShareType { report, conversation, businessPlan, demo, other }

class ShareLink {
  ShareLink({
    required this.id,
    required this.type,
    required this.createdAt,
    this.title,
    this.data,
    this.views,
    this.shareUrl,
    this.expiresAt,
  });

  final String id;
  final ShareType type;
  final DateTime createdAt;
  final String? title;
  final Map<String, dynamic>? data;
  final int? views;
  final String? shareUrl;
  final DateTime? expiresAt;

  factory ShareLink.fromJson(Map<String, dynamic> json) {
    return ShareLink(
      id: json['id']?.toString() ?? '',
      type: _parseType(json['type']),
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ??
          DateTime.now(),
      title: json['title']?.toString(),
      data: json['data'] is Map<String, dynamic>
          ? json['data'] as Map<String, dynamic>
          : json['content'] is Map<String, dynamic>
              ? json['content'] as Map<String, dynamic>
              : null,
      views: json['views'] is int ? json['views'] as int : null,
      shareUrl: json['shareUrl']?.toString(),
      expiresAt: DateTime.tryParse(json['expiresAt']?.toString() ?? ''),
    );
  }

  static ShareType _parseType(dynamic value) {
    switch (value) {
      case 'conversation':
        return ShareType.conversation;
      case 'business_plan':
        return ShareType.businessPlan;
      case 'demo':
        return ShareType.demo;
      case 'other':
        return ShareType.other;
      case 'report':
      default:
        return ShareType.report;
    }
  }
}
