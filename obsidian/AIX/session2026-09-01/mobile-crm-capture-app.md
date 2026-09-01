# Mobile CRM Capture App

Date: 2026-09-01
Agent: Codex / DaVinci

## Outcome

Scott proposed a private iOS/Android mobile app for Mojo staff to scan a person's LinkedIn QR code, or paste a LinkedIn profile URL, then classify and save the person into the Mojo CRM as a potential guest or partner. This direction was superseded later in the session by a Blinq plus Zapier integration.

## Recommended Direction

Use an Expo React Native mobile app with camera QR scanning and a dedicated Cloudflare Pages Function endpoint in the AIX/Mojo CRM backend. Treat the LinkedIn QR code as a user-provided profile URL. Do not scrape LinkedIn or claim automatic profile enrichment unless Mojo later receives approved LinkedIn API access or uses another compliant enrichment provider.

## Key Decisions

- First version should capture URL, classification, event context, relationship owner, notes, and next action.
- Deduplicate by email when available, otherwise by normalized LinkedIn profile URL.
- Existing CRM storage already supports contact records and LinkedIn URL indexing.
- Add mobile provenance fields such as capture source, captured by, captured at, and classification.
- App Store and Google Play submission require clear camera and personal-data disclosures, privacy policy updates, and accurate data safety declarations.

## Source Artifact

Original mobile app spec created at `docs/processes/mobile-crm-capture-app.md`. Current implementation direction is `docs/processes/blinq-zapier-crm-endpoint.md`.
