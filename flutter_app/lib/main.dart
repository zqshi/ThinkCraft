import 'package:flutter/material.dart';

import 'app.dart';
import 'infrastructure/di/injection.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  configureDependencies();
  runApp(const ThinkCraftApp());
}
