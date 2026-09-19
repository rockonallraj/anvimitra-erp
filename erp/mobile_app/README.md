# Anvi Mitra ERP Mobile App

Cross-platform mobile client for Android and iOS providing a unified experience for Super Admins, School Principals, Administrators, Teachers, Accountants, Parents, and Students.

## Architecture
- **Single App, Multi-Role**: One single application binary dynamically adapts navigation and capabilities based on the authenticated user's authoritative role.
- **Offline Sync**: Local response caching and outbox synchronization powered by IndexedDB/SQLite so staff and parents can work without uninterrupted internet connectivity.
- **Automatic Branding**: Automatically matches the theme colors, crest, and identity of the student's or teacher's school.
- **Native Android APK**: Compiled release APK is available under the repository's GitHub Releases tab.

## Running the App
```bash
# Get dependencies
flutter pub get

# Run on connected device or emulator
flutter run
```
