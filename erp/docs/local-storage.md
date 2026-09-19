# Local Storage & Connector Architecture

## Safe Premises Storage Model

Browsers should never have direct uncontrolled read/write access to `C:\SchoolData`. Instead:

```
School Computer / Server
     │
     └── Anvi Mitra Local Connector (Background Service)
              │
              ├── Read / Write Files (Documents & Student Photos)
              ├── Local Daily Backup
              ├── Cloud Sync
              └── Health Monitoring (Port 4899)
                       │
                       ▼
                 ERP Cloud API
```

## Security Rules
- Local connectors authenticate with an explicit bearer token.
- Connectors operate with scoped permissions (`read_only` or `read_write`).
- Paths are strictly sanitized against directory traversal attacks (`..`).
