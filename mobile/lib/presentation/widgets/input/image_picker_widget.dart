import 'package:flutter/material.dart';

class ImagePickerWidget extends StatelessWidget {
  const ImagePickerWidget({
    super.key,
    required this.onTap,
    this.isBusy = false,
  });

  final VoidCallback onTap;
  final bool isBusy;

  @override
  Widget build(BuildContext context) {
    return IconButton(
      icon: Icon(isBusy ? Icons.image_not_supported : Icons.image),
      onPressed: isBusy ? null : onTap,
      tooltip: 'Image OCR',
    );
  }
}
