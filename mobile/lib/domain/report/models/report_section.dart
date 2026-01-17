class ReportSection {
  ReportSection({
    required this.title,
    required this.content,
  });

  final String title;
  final String content;

  factory ReportSection.fromJson(Map<String, dynamic> json) {
    return ReportSection(
      title: json['title']?.toString() ?? '',
      content: json['content']?.toString() ?? '',
    );
  }
}
