import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../application/state/conversation_state.dart';

class ConversationRefreshButton extends ConsumerWidget {
  const ConversationRefreshButton({super.key, required this.userId});

  final String userId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return IconButton(
      icon: const Icon(Icons.refresh),
      onPressed: () => ref.invalidate(conversationListProvider(userId)),
    );
  }
}
