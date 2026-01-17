import 'package:flutter/material.dart';

class DownloadLink extends StatelessWidget {
  const DownloadLink({super.key, required this.label, required this.url});

  final String label;
  final String url;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const Icon(Icons.link, size: 18), // 对齐Web端18px
        const SizedBox(width: 8),
        Expanded(child: Text(label)),
        Text(url, style: const TextStyle(fontSize: 12)),
      ],
    );
  }
}
