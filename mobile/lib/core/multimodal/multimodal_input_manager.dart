import 'package:image_picker/image_picker.dart';

import 'image_processor.dart';
import 'speech_service.dart';

class MultimodalInputManager {
  MultimodalInputManager({
    SpeechService? speechService,
    ImageProcessor? imageProcessor,
  })  : _speechService = speechService ?? SpeechService(),
        _imageProcessor = imageProcessor ?? ImageProcessor();

  final SpeechService _speechService;
  final ImageProcessor _imageProcessor;
  final ImagePicker _imagePicker = ImagePicker();

  Future<String> captureVoiceInput() async {
    return _speechService.listenOnce();
  }

  Future<String?> captureImageText() async {
    final image = await _imagePicker.pickImage(source: ImageSource.gallery);
    if (image == null) {
      return null;
    }
    return _imageProcessor.extractText(image.path);
  }

  Future<void> dispose() async {
    await _speechService.stop();
    await _imageProcessor.dispose();
  }
}
