# Partner Profile Intake Web Form

Updated: 2026-09-01

## Summary

The external DOCX partner profile intake was converted into a public web form at `/partnerinfo/`.

## Implementation

- Public page: `dist/partnerinfo/index.html`
- Public submit endpoint: `functions/api/partner-info.js`
- CRM matrix integration: `dist/crm/index.html` and `functions/api/crm.js`
- Privacy notice update: `dist/privacy/index.html`

## Data Model

Partner intake submissions are stored as `crm:partner-info:{companySlug}:{timestamp}:{id}`.

Each submission also updates the matching `partner-company:{companySlug}` rollup with profile basics, contacts, and latest intake metadata.

Logo uploads are stored as private CRM artifacts under `crm/partner-info-logos/{companySlug}/...` and are surfaced in the matrix by filename/status rather than rendered publicly.

## Partner Matrix Behavior

The Partner Matrix payload now includes `partnerInfoSubmissions`.

Rows match a submitted intake by company slug, contact email, or executive LinkedIn URL. Matched rows show a `Profile Intake` action that opens the full intake details in a modal. Unmatched rows show `Send Intake`, linking to `/partnerinfo/?company=...`.

## Verification

- `node --check functions/api/partner-info.js`
- `node --check functions/api/crm.js`
- Inline script parse checks for `/partnerinfo/` and `/crm/`
- `node scripts/check-website-analytics-privacy.mjs`
- Static HTTP checks for `/partnerinfo/`, `/privacy/`, and `/crm/`
- Mocked submit/read test for `/api/partner-info`
