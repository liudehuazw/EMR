# Changelog

## 2026-09-24 — Local storage production fixes

### Fixed

- **Refresh wiping UI data**: `loadFromBackend` no longer replaces localStorage with empty API results when the backend fails or returns zero patients while local cache exists; unsynced local rows (no `backendId`) are merged after sync.
- **Incognito / empty patient list**: `PatientService` lets admin see and claim `patient.user_id IS NULL` rows; migration `V6__backfill_patient_user_id.sql` for legacy DBs.
- **Local file preview**: authenticated `fetch` → `blob:` URLs (`usePreviewDisplayUrl`, `loadPreviewDisplayUrl`); Spring `X-Frame-Options: SAMEORIGIN`; Nginx `location ^~ /api/` to avoid `.pdf` static rules stealing preview URLs.
- **Medical record delete**: `deleteRecord()` in `useRecords` calls backend DELETE then removes local state; errors surfaced in UI (no silent `catch`).
- **Login 502 after deploy**: clearer message in `auth.js`; remote deploy waits up to 120s for `/api/health` (cold start ~60s on small VMs).

### Added

- `frontend-vite/src/utils/backendSync.js`
- `frontend-vite/src/composables/usePreviewDisplayUrl.js`
- `scripts/diagnose-emr-backend.sh`, `scripts/patch-nginx-api-priority.sh`
- `database/V6__backfill_patient_user_id.sql`

### Changed

- Stores: `usePatients`, `useRecords`, `useLab`, `useImaging`, `useInvoice`, `App.vue`, `LoginView.vue`, `RecordsView.vue`, related preview components
- Backend: `PatientService`, `FileUploadController`, `LocalFileStorageStrategy`, `SecurityConfig`, `application-docker.yml`
- `deploy-update.sh`, `frontend-vite/nginx.conf`, `scripts/deploy-config.ps1` (health wait loop)

### Ops notes (self-hosted / Baota)

- Set `FILE_UPLOAD_PATH` to a persistent directory; ensure inner (8088) and outer Nginx use `^~ /api/` for API and disable caching on `/api/files/`.
- After `systemctl restart emr-backend`, wait for Tomcat before testing login (~60s on 256MB heap).

---

## 2026-09 — System settings, AI config, and storage improvements

### Added

- **System settings dialog** (NavBar): admins can switch site-wide storage between OSS and local disk; all users can configure their own AI model (provider preset, API URL, model ID, encrypted API key).
- **Per-user AI configuration**: DeepSeek, Qwen, Zhipu, Kimi, Ollama, and custom OpenAI-compatible endpoints; online connection test before save.
- **Dual file storage strategy**: pluggable OSS / local storage with runtime switching via `emr_system_config`.
- **OCR text editing**: PATCH endpoints to save edited OCR raw text on lab and imaging reports.
- **File preview helper**: JWT-aware preview URLs for local-stored files.
- **Database tables**: `emr_system_config`, `emr_user_ai_config` (migration `V5__system_and_ai_config.sql`).

### Changed

- **AI analysis & assistant**: uses each user's configured model instead of a fixed global provider; assistant tool queries are scoped to the logged-in user's patients.
- **Lab / imaging services**: OCR text update, structured `table_data` on lab reports, file cleanup on record delete.
- **File upload controller**: supports both OSS and local storage based on system config; preview endpoint with token fallback.
- **Security**: JWT filter and security config updated for new config endpoints and file preview routes.
- **Lab report entity**: removed direct `user_id` column; data isolation via `patient.user_id` only.

### Database migrations

| Script | Purpose |
|--------|---------|
| `V5__system_and_ai_config.sql` | Add system config and user AI config tables |
| `V6__backfill_patient_user_id.sql` | Set `patient.user_id = 1` where NULL (legacy installs; adjust admin id if needed) |
| `V6__fix_missing_columns.sql` | Backfill missing columns on existing databases (`table_data`, invoice `title`, patient fields) |

Fresh installs: run `database/init.sql` only (includes all tables).

### Changed (defaults)

- Default file storage is **`local`** (was `oss`) for new installs and bootstrap config; existing databases keep their current `storage_type` until changed in system settings.

### Notes

- Sensitive values (database passwords, OSS keys, AI API keys) remain in environment variables — never committed to the repository.
- **Default storage type is `local`** (files on server disk); configure `ALIYUN_OSS_*` and switch to OSS in system settings when cloud storage is needed.
