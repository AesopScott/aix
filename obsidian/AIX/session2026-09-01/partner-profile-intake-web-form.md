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

Partner intake submissions are stored as `crm:partner-info:{companySlug}:{timestamp}:{id}` as submission/audit records.

The public form must select company legal name from the existing `partner-company:` list. Submissions resolve back to the selected existing partner-company slug and are rejected if the selected slug/name do not match a stored partner company.

Each submission updates the matching `partner-company:{companySlug}` rollup using existing CRM field names where the data already exists: `organizationName`, `companyName`, `company`, `companyLegalName`, `website`, `headquarters`, `description`, `partnerClientMessaging`, `primaryCategory`, `categories`, `targetExecutiveRoles`, `targetIndustries`, `targetEmployeeRange`, logo metadata, and `contacts`. Intake-specific answers that do not have existing CRM fields are retained under `partnerInfoAudit` rather than treated as separate canonical CRM fields.

Logo uploads are stored as private CRM artifacts under `crm/partner-info-logos/{companySlug}/...` and are surfaced in the matrix by filename/status rather than rendered publicly.

## Partner Matrix Behavior

The Partner Matrix payload now includes `partnerInfoSubmissions`.

Rows match a submitted intake by company slug, contact email, or executive LinkedIn URL. Matched rows show a `Profile Intake` action that opens the full intake details in a modal. Unmatched rows show `Send Intake`, linking to `/partnerinfo/?company=...`.

## CRM Intake Editing

The CRM partner pipeline includes an `Intake` nav view. The view lists partner intake submissions as editable CRM forms, including basics, people, market, AI point of view, optional depth, permissions, notes, and signoff. Company legal name is edited through the existing partner-company dropdown. Saving an intake form updates the full `crm:partner-info:` submission and refreshes the matching `partner-company:` rollup. Uploaded logo metadata is visible in the editor, while binary logo replacement remains handled by the public intake upload flow.

## Verification

- `node --check functions/api/partner-info.js`
- `node --check functions/api/crm.js`
- Inline script parse checks for `/partnerinfo/` and `/crm/`
- `node scripts/check-website-analytics-privacy.mjs`
- Static HTTP checks for `/partnerinfo/`, `/privacy/`, and `/crm/`
- Mocked submit/read test for `/api/partner-info`
- Mocked CRM save test for `save-partner-info-submission`
