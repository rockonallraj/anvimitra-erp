# Firebase Cloud Messaging & Push Integration

## Architecture
- Mobile clients (Android APK & iOS) register FCM tokens with `POST /api/notifications/devices`.
- Background worker `push_worker.js` listens to pending notification events in PostgreSQL and dispatches them via Firebase Cloud Messaging v1 HTTP API.
- Topics:
  - `school_{schoolId}`: Entire institution broadcasts.
  - `class_{classId}_{sectionId}`: Homework, timetable shifts, and class notices.
  - `user_{userId}`: Personal fee receipts and report card publications.
