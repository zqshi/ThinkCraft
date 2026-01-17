class BusinessPlanChapterResult {
  BusinessPlanChapterResult({
    required this.chapterId,
    required this.content,
    required this.agent,
    required this.tokens,
  });

  final String chapterId;
  final String content;
  final String agent;
  final int tokens;

  factory BusinessPlanChapterResult.fromJson(Map<String, dynamic> json) {
    return BusinessPlanChapterResult(
      chapterId: json['chapterId']?.toString() ?? '',
      content: json['content']?.toString() ?? '',
      agent: json['agent']?.toString() ?? '',
      tokens: (json['tokens'] is int) ? json['tokens'] as int : 0,
    );
  }
}

class BusinessPlanBatchResult {
  BusinessPlanBatchResult({
    required this.chapters,
    required this.totalTokens,
    required this.duration,
  });

  final List<BusinessPlanChapterResult> chapters;
  final int totalTokens;
  final double duration;

  factory BusinessPlanBatchResult.fromJson(Map<String, dynamic> json) {
    final chapters = (json['chapters'] as List<dynamic>? ?? [])
        .map((item) =>
            BusinessPlanChapterResult.fromJson(item as Map<String, dynamic>))
        .toList();
    return BusinessPlanBatchResult(
      chapters: chapters,
      totalTokens: (json['totalTokens'] is int) ? json['totalTokens'] as int : 0,
      duration: (json['duration'] is num) ? (json['duration'] as num).toDouble() : 0,
    );
  }
}
