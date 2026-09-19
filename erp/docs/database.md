# Database Schema & Multi-School Data Design

## Schema Organization
The PostgreSQL database organizes the multi-school domain into isolated partitions via `school_id`:

1. **Institutions & Tenants**: `schools`, `school_settings`, `branches`
2. **Identity & Access**: `users`, `audit_logs`
3. **Academics**: `academic_sessions`, `classes`, `sections`, `subjects`, `teacher_subject_assignments`
4. **Students & Admissions**: `students`, `parents`, `enrollments`, `admissions`
5. **Examinations**: `exam_types`, `exams`, `exam_subjects`, `exam_marks`, `report_cards`
6. **Finance**: `fee_heads`, `fee_structures`, `student_fee_assignments`, `fee_installments`, `fee_receipts`, `fee_ledger`
7. **Offline Sync**: `sync_devices`, `sync_changes`, `sync_conflicts`, `local_storage_connectors`

## Automated Migrations
Migrations are tracked in the `schema_migrations` table and executed in strict numeric ascending order via `node src/migrate.js` with advisory lock `anvi-mitra-erp-migrations`.
