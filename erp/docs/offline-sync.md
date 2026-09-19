# Offline Synchronization & Cache Architecture

## Sync Protocol

```
ONLINE
   ↓
API (/api/*)
   ↓
PostgreSQL
   ↓
Local Cache (IndexedDB / SQLite)

OFFLINE
   ↓
Local Cache
   ↓
Outbox Queue
   ↓
Staff Continues Working
   ↓
Internet Restored
   ↓
Sync Queue (/api/sync/push)
   ↓
Server Idempotency & Conflict Check
   ↓
PostgreSQL Updated
```

## Device Cursors & Change Journals
1. Every client registers a unique device key via `POST /api/sync/device`.
2. Clients track a persistent `cursor` integer.
3. Mutations are fetched via `POST /api/sync/pull` and applied locally.
4. Client offline operations contain a `client_change_id` for idempotency protection against network retries.
