import 'package:flutter/material.dart';

class AppTheme {
  static ThemeData get light {
    return ThemeData(
      useMaterial3: true,
      colorSchemeSeed: const Color(0xFF2D6A4F),
      scaffoldBackgroundColor: const Color(0xFFF7F6F2),
    );
  }
}
