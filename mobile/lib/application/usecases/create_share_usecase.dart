import '../../domain/share/models/share_link.dart';
import '../../domain/share/repositories/share_repository.dart';
import '../../domain/share/services/share_service.dart';

class CreateShareUseCase {
  CreateShareUseCase(this._repository, this._service);

  final ShareRepository _repository;
  final ShareService _service;

  Future<ShareLink> execute({
    required String userId,
    required ShareType type,
    required Map<String, dynamic> data,
    String? title,
  }) async {
    final share = _service.create(type: type, data: data, title: title);
    return _repository.createShare(userId, share.type, share.data ?? {}, title: title);
  }
}
