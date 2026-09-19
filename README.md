# Anvi Mitra ERP

Multi-school, multi-branch School ERP with Web + Flutter mobile clients, centralized PostgreSQL data, offline-first synchronization, school-specific branding/app configuration, and role/subject/class-level access control.

> Progress marker: [x] implementation complete · [~] verification/hardening pending · [ ] not implemented

## Current Status — 2026-09-17

**Current phase: Core implementation checkpoint → CI contract repair → E2E verification → production sign-off**

- [x] **Core multi-school ERP implementation checkpoint completed** — multi-school provisioning, enrollment, teacher-scoped marks, offline sync foundation, local storage connector and academic-content foundation are implemented; remaining unchecked items are verification/production or explicitly deferred modules.

### Latest implementation checkpoints
- [x] Parent Portal APIs connected to the existing Parent Dashboard.
- [x] Multi-school Super Admin provisioning: school + settings + main branch + mobile configuration + optional first administrator are provisioned atomically.
- [x] School Management API: detail, update, branches and secure branding/logo propagation.
- [x] Super Admin animated School Management UI with provisioning form.
- [x] Teacher class/subject/section/session permission management and server-side marks authorization.
- [x] Student/staff enrollment and parent linking.
- [x] Offline sync foundation: devices, cursor journal, idempotency, conflicts, web cache/outbox and reconnect synchronization.
- [x] Permissioned local PC/NAS storage connector foundation.
- [x] Sync device management and conflict-resolution UI/API.
- [x] Student and staff attendance with offline attendance synchronization.
- [x] Timetable and period management.
- [x] Fee management foundation, installments, late fees, payment intents/webhooks and finance audit trail foundation.
- [x] Notification tap routing foundation.
- [x] **Academic content checkpoint (2026-09-16): academic calendar, teacher-authorized homework assignments, study-material publishing and homework-submission data model foundation added.**
- [x] **Sync monitoring checkpoint (2026-09-17): Super Admin sync health dashboard added with device health, journal cursor/change counts and pending-conflict visibility.**
- [x] **Sync runtime contract checkpoint (2026-09-17): journal schema hardened for device-aware idempotency and base-cursor conflict detection; migration `033_sync_runtime_contract.sql` added.**

### Current verification / production hardening
- [~] Clean PostgreSQL migration run against an empty database
- [~] Authenticated Super Admin E2E
- [~] Offline push/pull/idempotency/conflict E2E
- [~] Local storage E2E
- [~] Enrollment/staff/teacher-permission E2E
- [x] CI/static contract verification after implementation checkpoints
- [x] Sync device management contract verification
- [ ] Complete entity push/pull adapters
- [ ] Offline fees/receipts
- [ ] Offline exams/marks
- [ ] Offline enrollment
- [x] Sync monitoring/retry dashboard implementation
- [ ] Full Android analyze/build + APK artifact verification
- [ ] Flutter integration tests
- [ ] Accessibility audit
- [ ] Security audit
- [ ] Backup/restore drill
- [ ] Disaster recovery drill
- [ ] Load/performance test
- [ ] Monitoring/alerting
- [ ] Production deployment
- [ ] Final ERP sign-off

## Architecture

**Primary data:** Online PostgreSQL/API is the source of truth.

**Offline:** Web and mobile clients keep a local cache/outbox. Writes made while offline remain queued and synchronize automatically when connectivity returns. Server cursors, idempotency keys and conflict records prevent silent data loss.

**Secondary storage:** School PC/NAS/external-drive storage is accessed only through an explicitly permissioned local connector with `read_only` or `read_write` modes. A website never receives unrestricted filesystem access.

**Security:** Tenant isolation uses `school_id`; branch-aware users use `branch_id`. Teacher marks are authorized by teacher + subject + class/section + academic session + enrollment, and offline changes are re-authorized during synchronization.

## 🏗️ Production-Grade Multi-School ERP Structure

```
Anvi-Mitra-ERP/
│
├── README.md
├── LICENSE
├── .gitignore
│
├── .github/
│   └── workflows/
│       ├── mobile-app-build-fixed.yml   # Release APK build & GitHub release
│       ├── backend-ci.yml               # Node syntax checks & 25 contract test suites
│       └── database-check.yml           # PostgreSQL schema replay & migration checks
│
├── android/                             # Android Native Wrapper / Bridge Client
│   └── app/src/main/
│       ├── java/com/anvimitra/erp/      # Native bridge with offline fallback & config dialog
│       └── res/values/strings.xml       # Default server URL: workers.dev
│
└── erp/
    ├── src/
    │   ├── server.js                    # Central Express API server
    │   ├── auth.js                      # JWT auth, resilient standalone mode, school-scoping
    │   ├── security.js                  # Rate limiting, sanitize, CORS, Helmet
    │   ├── database.js                  # PostgreSQL connection pool & transactions
    │   ├── error_handler.js             # Central error handling & audit logging
    │   │
    │   ├── schools.js                   # Multi-school CRUD, branding, domain mapping
    │   ├── branches.js                  # Branch management per school
    │   ├── users.js                     # Multi-role user management (Super Admin, etc.)
    │   ├── people.js                    # Students, teachers, staff master records
    │   ├── students.js                  # Student admissions, profiles, roll numbers
    │   ├── teachers.js                  # Teacher profiles, subject allocation
    │   ├── enrollment.js                # Session-wise class/section enrollment
    │   │
    │   ├── attendance.js                # Daily student attendance, bulk, biometric
    │   ├── staff_attendance.js          # Teacher/staff attendance, leaves
    │   ├── timetable.js                 # Class/teacher schedules, period allocation
    │   ├── homework.js                  # Daily homework assignments, submissions
    │   │
    │   ├── exams.js                     # Exam schedules, grade scales, admit cards
    │   ├── marks.js                     # Subject-wise marks entry, validation
    │   ├── marks_permissions.js         # Teacher-scoped marks entry authorization
    │   ├── reportcard_engine_route.js   # CBSE/ICSE/State Board report card engine
    │   ├── reportcard_context.js        # Report card data aggregator
    │   ├── reportcard_list.js           # Batch report card generation
    │   ├── reportcard_bulk.js           # Bulk PDF export & background jobs
    │   ├── reportcard_result_sync.js    # Sync marks to final results
    │   │
    │   ├── fees.js                      # Fee structures, heads, categories
    │   ├── fee_assignments.js           # Student fee assignment (concession, quota)
    │   ├── fee_installments.js          # Due dates, fine calculation, installments
    │   ├── fee_ledger.js                # Complete student fee account ledger
    │   ├── fee_receipts.js              # Printable/downloadable payment receipts
    │   ├── payment_gateway.js           # Razorpay / Cashfree / UPI integration
    │   │
    │   ├── transport.js                 # Buses, drivers, route mapping, tracking
    │   ├── transport_routes.js          # Pickup/drop stops, vehicle assignment
    │   │
    │   ├── notifications.js             # FCM push notifications, in-app alerts
    │   ├── sms.js                       # SMS gateway (DLT registered templates)
    │   ├── whatsapp.js                  # WhatsApp Business API for fee alerts/reports
    │   │
    │   ├── sync.js                      # Offline cursor journal & push/pull sync
    │   ├── sync_devices.js              # Registered sync devices per school
    │   ├── conflicts.js                 # Conflict detection, audit & manual resolve
    │   ├── local_storage.js             # Local PC/NAS folder access bridge
    │   │
    │   ├── backup.js                    # PostgreSQL automated dump & restore
    │   ├── audit_logs.js                # Full system audit trail per school
    │   │
    │   ├── mobile.js                    # Mobile app API endpoints & version check
    │   ├── mobile_dashboards.js         # Role-specific mobile dashboard data
    │   └── routes.js                    # Central route aggregator & mount point
    │
    ├── sql/                             # PostgreSQL Migrations
    ├── web/                             # Web Front-end & Role Dashboards
    │   ├── super-admin/                 # Super Admin control panel
    │   ├── admin/                       # School admin dashboard
    │   ├── teacher/                     # Teacher dashboard
    │   ├── accountant/                  # Fee & finance dashboard
    │   ├── parent/                      # Parent portal
    │   └── shared/                      # Shared CSS & JS design system
    │
    ├── mobile_app/                      # Flutter Cross-Platform Mobile App
    │   ├── branding/                    # Multi-school whitelabel assets
    │   └── lib/                         # Mobile core & client config
    │
    ├── local_connector/                 # Local PC / NAS Bridge (Node.js Service)
    ├── docs/                            # Production Architecture & API Documentation
    └── scripts/                         # Maintenance & Seed Utilities
```


## Master ERP Roadmap

**Completion rule:** ERP is **100% complete only when every implementation item and every verification/production item is [x].**

### Platform & Multi-School
- [x] Central PostgreSQL/API
- [x] Multi-school tenant isolation
- [x] Multi-branch structure
- [x] School settings/branding/logo
- [x] School-specific mobile-app configuration
- [x] Super Admin School Management
- [x] Add School provisioning
- [x] Main branch provisioning
- [x] First school administrator provisioning
- [ ] Bulk school import
- [ ] SaaS subscription/billing

### Roles & Security
- [x] Super Admin
- [x] Principal/Admin
- [x] Teacher
- [x] Student
- [x] Parent
- [x] Driver
- [x] Server-side authorization
- [x] Teacher → class → section → subject → session permissions
- [x] Server-side marks authorization
- [ ] MFA/2FA
- [ ] Complete security audit
- [ ] Complete audit-log coverage

### People & Enrollment
- [x] Staff accounts
- [x] Teacher profiles
- [x] Student profiles
- [x] Parent profiles
- [x] Student enrollment
- [x] Parent-student linking
- [x] Enrollment management UI
- [ ] Bulk student/staff import
- [ ] Document/KYC attachments
- [ ] ID-card generation
- [ ] Student promotion/session rollover

### Academics
- [x] Academic sessions
- [x] Classes
- [x] Sections
- [x] Subjects
- [x] Teacher assignments
- [x] Timetable
- [x] Period management
- [x] Teacher substitution foundation
- [x] Homework/assignments
- [x] Study material
- [x] Academic calendar
- [ ] Syllabus/progress tracking

### Attendance
- [x] Student attendance
- [x] Staff/teacher attendance
- [x] Daily/monthly reports
- [x] Leave/late/half-day
- [x] Offline attendance + sync
- [ ] Parent attendance notifications

### Exams, Marks & Results
- [x] Exam foundation
- [x] Teacher marks permissions
- [x] Marks save/sync journal
- [ ] Exam scheduling
- [ ] Marks validation hardening
- [ ] FA1 / FA2 / FA3
- [ ] Half Yearly / Yearly
- [ ] Grades/totals
- [ ] Result processing
- [ ] Report cards
- [ ] PDF/print report cards
- [ ] Rank/position rules
- [ ] Result publishing

### Fees & Finance
- [x] Fee structures and invoices
- [x] Installments
- [x] Late fees
- [x] Fee collection/receipts
- [~] Online payment gateway live provider adapter
- [x] Finance audit trail foundation

### Parent Portal & Mobile
- [x] Parent dashboard
- [x] Child switching
- [x] Attendance
- [x] Marks/results
- [x] Homework
- [x] Fees/receipts
- [ ] Notices/communication/profile documents
- [x] Notification tap routing foundation
- [ ] Production Firebase configuration per school

### Notifications & Communication
- [x] Push notification foundation
- [x] Notification action routing
- [ ] Fee notifications
- [ ] Attendance notifications
- [ ] Exam/result notifications
- [ ] Homework notifications
- [ ] Announcements
- [ ] Targeted role/class/section notifications
- [ ] Notification history/read state/preferences

### Dashboards & Reports
- [x] Role-aware dashboard foundation
- [ ] Super Admin analytics
- [ ] School/Principal analytics
- [ ] Teacher analytics
- [ ] Student analytics
- [ ] Attendance/fee/result analytics
- [ ] CSV/Excel/PDF exports
- [ ] Scheduled reports

### Transport
- [x] Vehicle/route/assignment data foundation
- [ ] Driver mobile workflow
- [ ] Route attendance
- [ ] Transport notifications/fees

### Library
- [x] Book/loan data foundation
- [ ] Copies/barcodes
- [ ] Issue/return/fines workflow UI
- [ ] Library reports/search

### Inventory & Assets
- [x] Inventory item/transaction data foundation
- [ ] Purchases/issue-return/vendors
- [ ] Asset register/assignment
- [ ] Stock reports/low-stock alerts

### HR & Payroll
- [x] Employee/leave/payroll data foundation
- [ ] Staff documents/departments
- [ ] Salary structures
- [ ] Payroll/payslips/reports

### Offline-First Sync
- [x] Sync database foundation
- [x] Device registration
- [x] Server cursor/change journal
- [x] Idempotency
- [x] Conflict foundation + resolution UI
- [x] Web cache/outbox + reconnect sync
- [x] Offline attendance
- [x] Offline teacher marks authorization foundation
- [ ] Complete entity push/pull adapters
- [ ] Offline fees/receipts
- [ ] Offline exams/marks
- [ ] Offline enrollment
- [x] Sync monitoring/retry dashboard
- [x] Sync runtime schema contract for device-aware idempotency/base cursors

### School PC/NAS Storage
- [x] Permissioned connector model
- [x] Read-only/read-write modes
- [x] User-selected folder permission
- [x] Connector health UI
- [ ] Incremental file sync
- [ ] Disconnect/recovery E2E
- [ ] Local-file conflict handling
- [ ] NAS-specific deployment

### White-Label / School Apps
- [x] Per-school app config
- [x] Per-school branding
- [ ] Per-school app build pipeline
- [ ] School-specific icon/splash
- [ ] School-specific Firebase config
- [ ] School-specific Android/iOS identifiers
- [ ] Automated release pipeline
- [ ] White-label web branding

### Production Hardening
- [~] Clean migration verification
- [~] Super Admin onboarding E2E
- [~] Offline E2E
- [~] Local storage E2E
- [~] Enrollment/permission E2E
- [x] CI/static contract verification
- [ ] Full Android analyze/build + APK artifact verification
- [ ] Accessibility/security audits
- [ ] Backup/restore + disaster recovery drills
- [ ] Load/performance testing
- [ ] Monitoring/alerting
- [ ] Production deployment
- [ ] Final ERP sign-off

**README checkpoint rule:** after every completed logical implementation checkpoint, update the relevant marker. Never mark production/E2E verification [x] without an actual successful infrastructure-backed run.

**LSKLive website remains separate and is not modified as part of ERP development.**
