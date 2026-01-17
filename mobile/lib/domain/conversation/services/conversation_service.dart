import '../models/conversation.dart';
import '../models/message.dart';

class ConversationService {
  Conversation create({
    required String userId,
    required String title,
  }) {
    return Conversation(
      id: '${userId}_${DateTime.now().millisecondsSinceEpoch}',
      userId: userId,
      title: title,
      messages: const [],
      createdAt: DateTime.now(),
    );
  }

  Message createMessage({
    required MessageRole role,
    required String content,
  }) {
    return Message(
      id: DateTime.now().microsecondsSinceEpoch.toString(),
      role: role,
      content: content,
      createdAt: DateTime.now(),
    );
  }
}
