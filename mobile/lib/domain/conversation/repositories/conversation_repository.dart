import '../models/conversation.dart';
import '../models/message.dart';
import '../models/conversation_reply.dart';

abstract class ConversationRepository {
  Future<Conversation> createConversation(String userId, String title);
  Future<List<Conversation>> getUserConversations(String userId);
  Future<List<Message>> getMessages(String conversationId);
  Future<Message> addMessage(String conversationId, Message message);
  Future<ConversationReply> sendMessage(String conversationId, String message);
}
