# Website Analytics Privacy and Conversion Standards

Updated: 2026-08-13

MOJO AI Summits established a website analytics, privacy notice, consent, and conversion tracking standard in `C:\Users\scott\Code\aix\docs\processes\website-analytics-privacy-conversion-standards.md`.

## Decisions

- Default analytics posture is privacy-first and low-data: Cloudflare platform analytics and/or Cloudflare Web Analytics plus first-party operational conversion records.
- No public cookie banner is required for the approved baseline as long as implementation stays limited to strictly necessary auth/security/platform cookies, Cloudflare-style cookieless aggregate analytics, and intentionally submitted registration/CRM records.
- Any non-essential tracker, advertising pixel, remarketing tag, cookie-based analytics, local-storage identifier, session replay, fingerprinting, or Google/Meta/LinkedIn ad measurement requires a consent mechanism before deployment.
- If Google tags are approved later, Google Consent Mode v2 must be implemented with denied defaults for `ad_storage`, `ad_user_data`, `ad_personalization`, and `analytics_storage` in consent-required regions.
- Conversion events must avoid email, phone, name, full invite code, SMS code, access token, passwords, and unreviewed free text.

## Site Update

The public privacy policy at `/privacy/` now includes website analytics, cookies, and conversion measurement language and has a last-updated date of August 13, 2026.

## Activation

- `AGENTS.md` now instructs future Codex sessions and contributors to read the standard before adding analytics, conversion tracking, cookies, ad tags, session replay, or similar tooling.
- `docs/processes/website-analytics-launch-checklist.md` defines the owner workflow for each launch.
- `scripts/check-website-analytics-privacy.mjs` provides a runnable launch gate for prohibited trackers and required privacy notice language.
- Member, guest, partner registration, and partner subscription request forms now pass allowed UTM/source fields into sanitized first-party `campaignAttribution` records.
- `/analytics/` is a visible internal operating page linked from `/admin/`.
- The setup tracker marks the one-time foundation item complete and now includes analytics launch checklist items in virtual-event and in-person per-event workflows.

## Next Review Triggers

- New analytics or advertising vendor.
- New public form collecting materially different information.
- Sponsor data-sharing rights change.
- Event recording, photography, transcript, attendee-list, or publication-use practices change.
- Payment, ticketing, email marketing, or calendar integrations change data handling.
