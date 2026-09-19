# Anvi Mitra ERP API Reference

## Authentication
- `POST /api/auth/login`: Authenticates users across roles (`super_admin`, `admin`, `teacher`, `accountant`, etc.).
- `POST /api/auth/switch-branch`: Switches active branch context for school-wide administrators.

## Core Management
- `GET /api/schools`, `POST /api/schools`, `PATCH /api/schools/:id`: School directory and branding.
- `GET /api/schools/:schoolId/branches`: Branch registry.
- `GET /api/students`, `POST /api/students`: Student profile lifecycle.
- `GET /api/attendance`, `POST /api/attendance`: Class session attendance.
- `GET /api/exams`, `POST /api/exams/marks`: Marks recording and result publication.
- `GET /api/fees/assignments`, `GET /api/fees/installments`: Fee collection engine.

## Sync & Offline
- `POST /api/sync/device`: Registers local device for background journal pulling.
- `POST /api/sync/pull`: Fetches mutations since last cursor.
- `POST /api/sync/push`: Submits queued offline outbox mutations.
