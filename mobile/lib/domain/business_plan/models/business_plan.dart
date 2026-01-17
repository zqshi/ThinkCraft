class BusinessPlanChapter {
  BusinessPlanChapter({
    required this.id,
    required this.title,
    required this.content,
  });

  final String id;
  final String title;
  final String content;
}

class BusinessPlan {
  BusinessPlan({
    required this.id,
    required this.userId,
    required this.createdAt,
    required this.chapters,
  });

  final String id;
  final String userId;
  final DateTime createdAt;
  final List<BusinessPlanChapter> chapters;
}
