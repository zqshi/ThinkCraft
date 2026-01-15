# ThinkCraft Flutter (DDD Starter)

This folder contains a DDD-aligned Flutter code skeleton that mirrors the backend domain boundaries.

## Structure
- `lib/core`: API client, storage, utils
- `lib/domain`: entities, repositories, domain services
- `lib/infrastructure`: repository implementations, DI
- `lib/application`: use cases, state
- `lib/presentation`: routing, pages, widgets, themes

## Notes
- Flutter SDK is not installed in this environment, so platform files are not generated.
- When you are ready to run the app locally, install Flutter and generate platform scaffolding.

## Suggested next steps (local)
1. Install Flutter SDK (3.x) and ensure `flutter` is on PATH.
2. In `flutter_app`, run:
   ```bash
   flutter pub get
   ```
3. If you need platform folders (ios/android/web), run:
   ```bash
   flutter create --org com.thinkcraft .
   ```
   This may update default files; re-apply custom `lib/` contents if needed.
