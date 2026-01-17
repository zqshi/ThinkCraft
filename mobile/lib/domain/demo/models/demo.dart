enum DemoType { landingPage, dashboard, mobileApp }

class Demo {
  Demo({
    required this.id,
    required this.type,
    required this.code,
    required this.createdAt,
    this.downloadUrl,
  });

  final String id;
  final DemoType type;
  final String code;
  final DateTime createdAt;
  final String? downloadUrl;
}
