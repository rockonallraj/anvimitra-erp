# Permission Architecture & Access Control

## Hierarchical Role Hierarchy

```
SUPER ADMIN (Platform Owner)
   │
   ├── Create / Manage Schools
   ├── School Profile & Custom Branding
   ├── Multi-Branch Provisioning
   ├── School Admin Assignment
   ├── System Settings & Global Backups
   │
   ▼
SCHOOL LEVEL
   │
   ├── Principal
   │    ├── Academic Setup
   │    ├── Full School Oversight
   │    └── Report Card Publishing
   │
   ├── Admin / Office Staff
   │    ├── Student Enrollment & Admissions
   │    ├── Attendance Monitoring
   │    └── Class & Subject Allocation
   │
   ├── Accountant
   │    ├── Fee Structures
   │    ├── Fee Assignments & Installments
   │    └── Receipts & Ledger
   │
   ├── Teachers
   │    ├── Class Attendance Marking
   │    ├── Assigned Subject Exam Marks
   │    └── Daily Homework
   │
   ├── Parents / Students
   │    ├── Children Profiles
   │    ├── Daily Attendance Calendar
   │    ├── Homework & Exam Results
   │    └── Online Fee Payment
   │
   └── Drivers
        └── Assigned Vehicle Route & Stops
```

## Granular Teacher Exam Mark Guard
Even when teachers are working offline, permission enforcement cannot be bypassed. The server validates:
`Teacher -> Assigned Branch -> Assigned Class -> Assigned Section -> Assigned Subject -> Exam Subject -> Student Enrollment`
via `teacher_can_edit_exam_subject()`.
