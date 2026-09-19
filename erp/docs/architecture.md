# Anvi Mitra ERP: Architecture & System Design

## 1. High-Level Architecture

```
                 ┌──────────────────┐
                 │   Super Admin    │
                 └────────┬─────────┘
                          │
                    Central ERP API
                          │
              ┌───────────┴───────────┐
              │                       │
        PostgreSQL                 File Storage
       SOURCE OF TRUTH            Photos/Documents
              │
       ┌──────┴──────┐
       │             │
     Website       Mobile App
       │             │
       └──────┬──────┘
              │
        Offline Cache
              │
         Sync / Outbox
              │
       ┌──────┴─────────┐
       │                │
   School PC/NAS    External HDD
   Local Connector     Backup
```

## 2. Platform Core Principles
- **Multi-Tenancy**: Central database with isolated tenant contexts via `school_id`.
- **Authoritative Server**: Server-side JWT role validation guards all critical operations.
- **Offline Capability**: Progressive Web App and Mobile App cache reads locally and queue mutating operations into an IndexedDB / SQLite outbox.
- **Local Storage Connector**: Independent desktop service running on school premises for local backups and PC/NAS sync without direct browser disk access.
