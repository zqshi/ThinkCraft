class CollaborationExecutionResult {
  CollaborationExecutionResult({
    required this.planId,
    required this.summary,
    required this.payload,
  });

  final String planId;
  final String summary;
  final Map<String, dynamic> payload;

  factory CollaborationExecutionResult.fromJson(
    String planId,
    Map<String, dynamic> json,
  ) {
    return CollaborationExecutionResult(
      planId: planId,
      summary: json['summary']?.toString() ?? '',
      payload: json,
    );
  }
}
