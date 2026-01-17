import 'package:flutter/material.dart';

class AgentAvatar extends StatelessWidget {
  const AgentAvatar({
    super.key,
    required this.emoji,
    required this.name,
  });

  final String emoji;
  final String name;

  @override
  Widget build(BuildContext context) {
    return CircleAvatar(
      radius: 20,
      child: Text(
        emoji.isNotEmpty ? emoji : name.characters.first,
        style: const TextStyle(fontSize: 18),
      ),
    );
  }
}
