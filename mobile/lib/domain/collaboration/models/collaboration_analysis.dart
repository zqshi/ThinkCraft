class CollaborationAnalysis {
  CollaborationAnalysis({
    required this.planId,
    required this.nextStep,
    required this.payload,
  });

  final String planId;
  final String nextStep;
  final Map<String, dynamic> payload;

  factory CollaborationAnalysis.fromJson(Map<String, dynamic> json) {
    return CollaborationAnalysis(
      planId: json['planId']?.toString() ?? '',
      nextStep: json['nextStep']?.toString() ?? '',
      payload: json,
    );
  }
}
