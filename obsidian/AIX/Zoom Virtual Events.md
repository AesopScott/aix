# Zoom Virtual Events

Updated: 2026-07-27

MOJO AI Summits now has a Cloudflare-native scaffold for five fall 2026 Zoom-backed virtual event share pages.

## Event Share Routes

- `/virtual/ai-executive-readiness.php`
- `/virtual/ai-use-cases-that-survive-finance.php`
- `/virtual/ai-integration-and-workflow.php`
- `/virtual/ai-security-governance-and-trust.php`
- `/virtual/ai-operating-model-for-2027.php`

Pretty routes without `.php` are also supported.

## Lockout Behavior

The share page calls `/api/virtual-events/[slug]`. The API reads the stored Zoom join URL from `MOJO_SUMMITS_SETUP_STATE` and stops returning it 15 minutes before the event start time.

Default start time is currently 10:00 AM America/Denver for each event until the operating schedule is finalized.

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
