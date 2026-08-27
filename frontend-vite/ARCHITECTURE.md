# Frontend Architecture

## Directory layout

```
frontend-vite/src/
├── api/                    # HTTP API layer (by domain)
│   ├── client.js           # apiRequest, API_BASE_URL
│   ├── auth.js
│   ├── patients.js
│   ├── lab-reports.js
│   ├── imaging-reports.js
│   ├── invoices.js
│   ├── medical-records.js
│   ├── ocr.js
│   ├── ai.js
│   ├── files.js
│   └── index.js            # re-exports (backward compatible)
├── components/
│   ├── common/             # Shared UI (PatientTabBar, DateRangeToolbar, AiAnalysisPanel, …)
│   ├── lab/                # Lab module components
│   └── invoice/            # Invoice module components
├── composables/            # Reusable Vue logic
│   ├── useDateRangeFilter.js
│   ├── useRoutePatientId.js
│   ├── lab/
│   └── invoice/
├── stores/                 # Pinia state (calls api/*)
├── utils/                  # Pure helpers (lab-parser, invoice-parser, …)
├── views/                  # Route pages (thin orchestration)
└── router/
```

## Conventions

- **Views** wire stores + composables + components; avoid large inline templates.
- **API** one file per backend resource; stores and views import from `@/api/<module>`.
- **Composables** hold filtering, chart logic, duplicate detection, etc.
- **Utils** hold OCR parsing and date/name extraction (no Vue dependencies).

## Module map

| Route | View | Key components | Key utils/composables |
|-------|------|--------------|------------------------|
| `/lab` | LabView | LabReportTable, LabReportList, LabTrendSection | useLabTrendChart, lab-report-utils |
| `/invoice` | InvoiceView | InvoicePatientSidebar, InvoiceSummaryBar | invoice-parser, useInvoiceDuplicates |
| `/patients` | PatientsView | — | — |
| `/imaging` | ImagingView | — | api/ocr, api/ai |
| `/records` | RecordsView | FilePreviewDialog | api/ocr |

## Adding a new API

1. Add functions in `src/api/<resource>.js` using `apiRequest` from `client.js`.
2. Call from Pinia store or view composable.
3. Export from `api/index.js` if needed for legacy imports.
