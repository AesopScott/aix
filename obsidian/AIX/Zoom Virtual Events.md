# Zoom Virtual Events

Updated: 2026-08-03

MOJO AI Summits now has a Cloudflare-native scaffold for twelve 2026-2027 Zoom-backed virtual event share pages.

## Event Share Routes

- `/virtual/ai-executive-readiness.php`
- `/virtual/ai-use-cases-that-survive-finance.php`
- `/virtual/ai-integration-and-workflow.php`
- `/virtual/ai-security-governance-and-trust.php`
- `/virtual/ai-operating-model-for-2027.php`
- `/virtual/ai-budgeting-and-investment-priorities.php`
- `/virtual/ai-workforce-readiness-and-change-leadership.php`
- `/virtual/ai-executive-operating-agenda-for-2027.php`

Pretty routes without `.php` are also supported.

## Lockout Behavior

The share page calls `/api/virtual-events/[slug]`. The API reads the stored Zoom join URL from `MOJO_SUMMITS_SETUP_STATE` and stops returning it 15 minutes before the event start time.

Each 2026-2027 virtual event runs from 1:00 PM to 2:30 PM America/Chicago. The share-page lockout begins 15 minutes before start time, at 12:45 PM Central.

## Zoom Creation

The local script `scripts/create-zoom-virtual-events.mjs` creates Zoom meetings with Server-to-Server OAuth and can write public join URLs into the Cloudflare KV namespace.

Required local env values:

- `ZOOM_ACCOUNT_ID`
- `ZOOM_CLIENT_ID`
- `ZOOM_CLIENT_SECRET`

Optional:

- `ZOOM_USER_ID`
- `MOJO_SUMMITS_SETUP_STATE_ID`

Do not store Zoom secrets, start URLs, invite tokens, or generated meeting-link reports in Obsidian or Git.
