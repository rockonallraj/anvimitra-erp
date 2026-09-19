# Backup & Disaster Recovery Architecture

## 1. Automated Snapshot Strategy
- **PostgreSQL Database**: Nightly dump via `pg_dump` with automated retention (30 daily, 12 monthly).
- **Physical Documents**: Sync journal records mirror student certificates and photos across premises storage and cloud object storage.

## 2. Recovery Procedures
Run restore CLI:
```bash
node scripts/restore.js --backup=latest
```
All tables and sequence states are verified against checksums before switching traffic.
