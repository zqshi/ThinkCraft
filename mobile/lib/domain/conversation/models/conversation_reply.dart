import 'message.dart';

class ConversationReply {
  ConversationReply({
    required this.userMessage,
    required this.assistantMessage,
  });

  final Message userMessage;
  final Message assistantMessage;

  factory ConversationReply.fromJson(Map<String, dynamic> json) {
    return ConversationReply(
      userMessage: Message.fromJson(json['userMsg'] as Map<String, dynamic>),
      assistantMessage:
          Message.fromJson(json['assistantMsg'] as Map<String, dynamic>),
    );
  }
}
