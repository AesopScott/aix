# Mobile CRM Capture App

Status: Superseded by Blinq/Zapier endpoint for first implementation
Date: 2026-09-01

Update: The first implementation will use Blinq for contact capture and Zapier for delivery into the CRM. See `docs/processes/blinq-zapier-crm-endpoint.md`.

## Purpose

Build a private Mojo AI Summits mobile app for iOS and Android that lets staff scan a LinkedIn QR code, paste a LinkedIn profile URL, classify the person as a potential guest or partner, and save the relationship into the Mojo CRM.

The first version should optimize for fast in-person capture at events, meetings, and partner conversations. It should not scrape LinkedIn or claim access to profile fields that LinkedIn does not provide for the scanned person.

## Recommended App Shape

- Framework: Expo React Native, built for App Store and Google Play through EAS Build.
- Scanner: `expo-camera` barcode scanning for QR codes.
- Backend: Cloudflare Pages Functions in this repository.
- Storage: existing CRM D1/KV/R2 helpers, especially `crm:contact:*` records and `linkedin_profile_url` indexing.
- Auth: Mojo Auth session or a mobile-scoped API token tied to an approved staff user.

## Core Workflow

1. Staff opens the app and signs in.
2. Staff taps Scan.
3. App requests camera permission and scans the LinkedIn QR code.
4. App normalizes the decoded value into a LinkedIn profile URL.
5. Staff selects the relationship intent:
   - Potential guest
   - Featured guest
   - Speaker or presenter
   - Roundtable leader
   - Partner candidate
   - Strategic partner contact
6. Staff optionally adds name, company, title, email, phone, event, relationship owner, notes, and next action.
7. App saves to a new CRM capture endpoint.
8. Backend dedupes by email when present, otherwise by normalized LinkedIn URL.
9. CRM contact history records who captured the contact, when, where/context, selected intent, source, and next action.

## Backend Endpoint

Add a dedicated endpoint such as:

`POST /api/mobile-crm-capture`

Suggested payload:

```json
{
  "linkedinProfileUrl": "https://www.linkedin.com/in/example/",
  "classification": "partner-candidate",
  "name": "",
  "company": "",
  "title": "",
  "email": "",
  "phone": "",
  "eventSlug": "",
  "relationshipOwner": "scott@mojoaisummits.com",
  "nextAction": "follow-up",
  "notes": "",
  "captureSource": "mobile-linkedin-qr",
  "capturedAt": "2026-09-01T00:00:00.000Z"
}
```

Suggested behavior:

- Require authenticated Mojo staff access.
- Validate that the URL is a LinkedIn profile URL before saving.
- If email is present, save under `crm:contact:{email}`.
- If email is missing, save under `crm:contact:linkedin:{normalized-profile-id}`.
- Append an activity event instead of overwriting existing CRM context.
- Create or update partner/guest prospect rows when the classification maps to the guest matrix or partner prospecting workflow.
- Return the normalized contact row and any duplicate/merge hints.

## Data Model Additions

Existing CRM records already support contact identity, LinkedIn URL, lifecycle stage, next action, notes, relationship owner, events, and activity. Add only the fields needed for mobile provenance:

- `captureSource`
- `capturedBy`
- `capturedAt`
- `classification`
- `scanPayload`
- `mergeCandidateKeys`

Avoid storing raw camera frames or screenshots.

## LinkedIn Constraints

LinkedIn QR codes should be treated as a user-provided URL source. LinkedIn's official Profile API is restricted to approved developers and authenticated-member data. The app should not scrape LinkedIn pages or store profile data returned for another member unless the data comes through an approved LinkedIn program or is manually entered by staff.

Reference sources:

- LinkedIn Profile API: https://learn.microsoft.com/en-us/linkedin/shared/integrations/people/profile-api
- LinkedIn API access and permissions: https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access
- LinkedIn basic profile fields: https://learn.microsoft.com/en-us/linkedin/shared/references/v2/profile/basic-profile

## Store And Privacy Requirements

The app will handle personal data and camera access. Before store submission:

- Add a privacy policy URL on the Mojo site.
- Add in-app disclosure before requesting camera permission.
- Explain that scanned profile URLs and manually entered contact details are stored in Mojo CRM for invitation, partnership, and follow-up workflows.
- Avoid nonessential SDKs, ad identifiers, contact-book access, location tracking, and analytics beyond low-data operational diagnostics.
- Provide a deletion/contact process for stored personal data.
- Fill out Apple privacy nutrition labels and Google Play Data Safety accurately.

Reference sources:

- Apple App Review Guidelines, Privacy: https://developer.apple.com/app-store/review/guidelines/#privacy
- Google Play User Data policy: https://support.google.com/googleplay/android-developer/answer/10144311
- Expo Camera: https://docs.expo.dev/versions/latest/sdk/camera/

## MVP Scope

Build first:

- Staff sign-in.
- Scan LinkedIn QR.
- Paste LinkedIn URL fallback.
- Contact classification selector.
- Event selector.
- Notes and next action.
- Submit to CRM.
- Duplicate warning and merge hint.
- Offline draft queue for bad reception.

Defer:

- LinkedIn OAuth or profile enrichment.
- Background sync.
- Push notifications.
- Full CRM editing.
- Device contacts import.
- Badge scanning for non-LinkedIn badges.

## Open Decision

Choose whether the first implementation should live in this repository as a `/mobile` app package, or in a separate repository that calls the existing Mojo CRM API.
