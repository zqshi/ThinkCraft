import 'package:flutter/material.dart';

class VoiceRecorderWidget extends StatelessWidget {
  const VoiceRecorderWidget({
    super.key,
    required this.onTap,
    this.isBusy = false,
  });

  final VoidCallback onTap;
  final bool isBusy;

  @override
  Widget build(BuildContext context) {
    return IconButton(
      icon: Icon(isBusy ? Icons.mic_off : Icons.mic),
      onPressed: isBusy ? null : onTap,
      tooltip: 'Voice input',
    );
  }
}
