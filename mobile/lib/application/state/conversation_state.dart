import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/conversation/models/conversation.dart';
import '../../domain/conversation/models/message.dart';
import 'providers.dart';

final conversationListProvider = FutureProvider.family<List<Conversation>, String>((ref, userId) {
  final repository = ref.read(conversationRepositoryProvider);
  return repository.getUserConversations(userId);
});

final conversationMessagesProvider = FutureProvider.family<List<Message>, String>((ref, conversationId) {
  final repository = ref.read(conversationRepositoryProvider);
  return repository.getMessages(conversationId);
});
