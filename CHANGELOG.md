# Changelog

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
| `V6__fix_missing_columns.sql` | Backfill missing columns on existing databases (`table_data`, invoice `title`, patient fields) |

Fresh installs: run `database/init.sql` only (includes all tables).

### Changed (defaults)

- Default file storage is **`local`** (was `oss`) for new installs and bootstrap config; existing databases keep their current `storage_type` until changed in system settings.

### Notes

- Sensitive values (database passwords, OSS keys, AI API keys) remain in environment variables — never committed to the repository.
- **Default storage type is `local`** (files on server disk); configure `ALIYUN_OSS_*` and switch to OSS in system settings when cloud storage is needed.
