import 'package:flutter/material.dart';

class MarkdownViewer extends StatelessWidget {
  const MarkdownViewer({super.key, required this.content});

  final String content;

  @override
  Widget build(BuildContext context) {
    return SelectableText(
      content,
      style: Theme.of(context).textTheme.bodyMedium,
    );
  }
}
