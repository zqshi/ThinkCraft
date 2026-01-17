class CollaborationModes {
  CollaborationModes({
    required this.planId,
    required this.modes,
    required this.metadata,
  });

  final String planId;
  final Map<String, dynamic> modes;
  final Map<String, dynamic> metadata;

  factory CollaborationModes.fromJson(Map<String, dynamic> json) {
    return CollaborationModes(
      planId: json['planId']?.toString() ?? '',
      modes: json['modes'] as Map<String, dynamic>? ?? {},
      metadata: json['metadata'] as Map<String, dynamic>? ?? {},
    );
  }
}
