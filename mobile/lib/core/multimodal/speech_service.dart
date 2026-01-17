import 'dart:async';

import 'package:speech_to_text/speech_to_text.dart';

class SpeechService {
  final SpeechToText _speech = SpeechToText();

  Future<String> listenOnce() async {
    final available = await _speech.initialize();
    if (!available) {
      throw Exception('Speech recognition unavailable');
    }

    final completer = Completer<String>();
    String interim = '';

    await _speech.listen(
      onResult: (result) {
        interim = result.recognizedWords;
        if (result.finalResult && !completer.isCompleted) {
          completer.complete(interim);
        }
      },
    );

    return completer.future.timeout(const Duration(seconds: 15), onTimeout: () {
      _speech.stop();
      return interim;
    });
  }

  Future<void> stop() async {
    await _speech.stop();
  }
}
