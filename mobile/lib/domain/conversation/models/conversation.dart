import 'message.dart';

class Conversation {
  Conversation({
    required this.id,
    required this.userId,
    required this.title,
    required this.messages,
    required this.createdAt,
    this.isPinned = false,
    this.analysisCompleted = false,
    this.tags = const [],
  });

  final String id;
  final String userId;
  final String title;
  final List<Message> messages;
  final DateTime createdAt;
  final bool isPinned;
  final bool analysisCompleted;
  final List<String> tags;

  factory Conversation.fromJson(Map<String, dynamic> json) {
    return Conversation(
      id: json['id']?.toString() ?? '',
      userId: json['userId']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      messages: (json['messages'] as List<dynamic>? ?? [])
          .map((item) => Message.fromJson(item as Map<String, dynamic>))
          .toList(),
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ??
          DateTime.now(),
      isPinned: json['isPinned'] == true,
      analysisCompleted: json['analysisCompleted'] == true,
      tags: (json['tags'] as List<dynamic>? ?? []).map((t) => t.toString()).toList(),
    );
  }
}
