import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorage {
  SecureStorage() : _storage = const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  Future<void> setSecret(String key, String value) async {
    await _storage.write(key: key, value: value);
  }

  Future<String?> getSecret(String key) async {
    return _storage.read(key: key);
  }

  Future<void> removeSecret(String key) async {
    await _storage.delete(key: key);
  }
}
