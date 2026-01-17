import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';

class ImageProcessor {
  final TextRecognizer _recognizer = TextRecognizer();

  Future<String> extractText(String imagePath) async {
    final inputImage = InputImage.fromFilePath(imagePath);
    final recognized = await _recognizer.processImage(inputImage);
    return recognized.text;
  }

  Future<void> dispose() async {
    await _recognizer.close();
  }
}
