import '../../core/api/api_client.dart';
import '../../domain/conversation/models/conversation.dart';
import '../../domain/conversation/models/conversation_reply.dart';
import '../../domain/conversation/models/message.dart';
import '../../domain/conversation/repositories/conversation_repository.dart';

class ConversationRepositoryImpl implements ConversationRepository {
  ConversationRepositoryImpl(this._apiClient);

  final ApiClient _apiClient;

  @override
  Future<Conversation> createConversation(String userId, String title) async {
    final response = await _apiClient.dio.post('/conversations', data: {
      'userId': userId,
      'title': title,
    });
    final data = response.data['data'] as Map<String, dynamic>;
    return Conversation.fromJson(data);
  }

  @override
  Future<List<Conversation>> getUserConversations(String userId) async {
    final response = await _apiClient.dio.get('/conversations/user/$userId');
    final list = response.data['data'] as List<dynamic>? ?? [];
    return list
        .map((item) => Conversation.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  @override
  Future<List<Message>> getMessages(String conversationId) async {
    final response =
        await _apiClient.dio.get('/conversations/$conversationId/messages');
    final list = response.data['data'] as List<dynamic>? ?? [];
    return list
        .map((item) => Message.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  @override
  Future<Message> addMessage(String conversationId, Message message) async {
    final response = await _apiClient.dio.post(
      '/conversations/$conversationId/messages',
      data: {
        'role': message.role.name,
        'content': message.content,
      },
    );
    final data = response.data['data'] as Map<String, dynamic>;
    return Message.fromJson(data);
  }

  @override
  Future<ConversationReply> sendMessage(
    String conversationId,
    String message,
  ) async {
    final response = await _apiClient.dio.post(
      '/conversations/$conversationId/send',
      data: {
        'message': message,
        'options': {},
      },
    );
    final data = response.data['data'] as Map<String, dynamic>;
    return ConversationReply.fromJson(data);
  }
}
