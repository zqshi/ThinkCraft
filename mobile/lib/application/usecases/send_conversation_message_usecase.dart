import '../../domain/conversation/models/conversation_reply.dart';
import '../../domain/conversation/repositories/conversation_repository.dart';

class SendConversationMessageUseCase {
  SendConversationMessageUseCase(this._repository);

  final ConversationRepository _repository;

  Future<ConversationReply> execute({
    required String conversationId,
    required String message,
  }) {
    return _repository.sendMessage(conversationId, message);
  }
}
