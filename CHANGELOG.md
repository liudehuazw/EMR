# Changelog

## 2026-10-21 — Invoice parser: medical-insurance payment breakdown

### Added

- `extractMedicalInvoiceAmounts()` in `frontend-vite/src/utils/invoice-parser.js` — parses the full payment breakdown of a medical-insurance receipt:
  `total = insurance fund + other payments + personal account + personal cash`.
- `extractMedicalItems()` — extracts charge items, skipping payment/summary rows.
- `isMedicalInvoice()` — routes medical receipts away from the VAT-invoice path.
- `pickMedicalAmount()` — label-anchored amount lookup; `pickMedicalTotal()` — reads the `(小写)` amount.
- Invoice columns `other_payment`, `account_payment`, `critical_illness_amount`, `personal_self_pay`, `personal_self_expense`, `other_insurance_amount`, `medical_assistance_amount` on `Invoice`.
- `database/V8__invoice_payment_breakdown.sql` — idempotent migration adding the seven columns.

### Notes on "其他支付" sub-items

`其他支付 = 大病保险支付 + 其他保险支付 + 医疗救助支付` (all four samples are covered entirely by critical-illness insurance). The three sub-items are **displayed alongside** "other payments" and never added to the total, to avoid double-counting.

### Fixed

- **`selfPay + insurance < total`**: `个人账户支付` and `其他支付` were never extracted, so the remainder was silently dropped. On a ¥913.13 receipt the missing ¥52.84 is exactly the personal-account payment.
- **Wrong insurance value**: the old parser stored the **cash** figure as `insuranceAmount` (¥685.63 instead of ¥174.66).
- **`selfPayAmount` always empty** on all six medical receipts tested.
- **Misleading fallback**: the trailing `selfPayAmount || totalAmount` turned the grand total into "self pay", inflating the commercial-insurance reimbursement cap.
- **Cash-payment fallback double-counting** (`2026101401`, total 559.09): when `个人现金支付` was explicitly `0.00`, the parser fell back to `个人自付` (32.78), so the four parts summed to 591.87 and tripped the reconciliation warning. Cash payment is now read from its own field only — no fallback. Correct: `477.15 + 49.16 + 32.78 + 0.00 = 559.09`.
  - Note: `个人账户支付 + 个人现金支付 = 个人自付 + 个人自费` holds in only 6 of 8 samples (`0999738844` differs by 52.84), so it cannot be used as a fallback basis.
  - Side effect: the reimbursement cap for that receipt went from an incorrect 32.78 to a correct **0** (fully covered by fund + account).

### Changed

- `InvoiceView.vue` — new payment-breakdown panel, reconciliation warning when the four parts do not sum to the total, and a tightened `getInvoiceSelfPayCap()`.
- `useInvoice.js` — syncs the five new fields on upload and on backend load.
- `getInvoiceSelfPayCap()` now returns the **personal cash payment**; when it is missing but a breakdown exists, it derives cash as `total − insurance − other − account` instead of falling back to the total.

### Notes

- **`大病保险支付` (critical-illness payment) is always equal to `其他支付`** in the samples (9.65/9.65, 34.75/34.75, 739.84/739.84). It is a sub-item of "other payments", so it is **displayed but never added** — summing both would double-count.
- Two OCR pitfalls handled: multiple `label: value` pairs on one line (taking the line-trailing number would set all four parts to the same value), and `个人账户余额` (balance) being mistaken for `个人账户支付`.
- Three OCR service implementations (`backend/ocr-service/main.py`, `deploy/main.py`, `ocr-service-main-fixed.py`) all join results as `"\n".join(texts)`, one text box per line — the parser's label-anchored logic works with all of them.

### Ops

```bash
mysql -u root -p emr_db < database/V8__invoice_payment_breakdown.sql
```

Existing invoices are not backfilled — use the per-invoice "重新解析" action, which now updates the new fields too.

---

## 2026-10-15 — Backend performance: batch counts, request-scoped user, quieter logs

### Added

- `GET /api/patient-summary/counts?patientIds=1,2,3` — returns per-patient counts for medical records / lab / imaging / invoices in **one** request (replaces `4 × patients` client calls).
- `PatientCountSummary` DTO, `PatientSummaryController`.
- `countByPatientIds(...)` on `MedicalRecordMapper`, `LabReportMapper`, `ImagingReportMapper`, `InvoiceMapper` (single `GROUP BY patient_id`).
- `security/UserPrincipal` — carries `userId` from JWT claims.
- `database/V7__perf_indexes.sql` — idempotent `(patient_id, deleted)` composite indexes.

### Changed

- `JwtAuthenticationFilter` reads `userId` from JWT claims into `UserPrincipal`; `SecurityUtils.getCurrentUserId()` no longer queries the user table.
- `PatientController.getCurrentUserId()` uses the claim, falling back to a DB lookup only for legacy tokens.
- `PatientService.claimOrphanPatientsForAdmin` now performs **one** batch `UPDATE ... IN (ids)` instead of a per-row update inside the paged read path.
- `application.yml` / `application-dev.yml`: removed `mybatis-plus.log-impl: StdOutImpl`.
- `application-prod.yml`: `io.lettuce` and `spring.data.redis` log level `DEBUG` → `WARN`.

### Ops

```bash
mysql -u root -p emr_db < database/V7__perf_indexes.sql
```

---

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
