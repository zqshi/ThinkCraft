import '../../domain/conversation/models/conversation.dart';
import '../../domain/conversation/repositories/conversation_repository.dart';
import '../../domain/conversation/services/conversation_service.dart';

class CreateConversationUseCase {
  CreateConversationUseCase(this._repository, this._service);

  final ConversationRepository _repository;
  final ConversationService _service;

  Future<Conversation> execute({
    required String userId,
    required String title,
  }) async {
    final conversation = _service.create(userId: userId, title: title);
    return _repository.createConversation(conversation.userId, conversation.title);
  }
}
