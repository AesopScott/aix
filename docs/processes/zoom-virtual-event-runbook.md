# Zoom Virtual Event Runbook

Date created: 2026-07-27

MOJO AI Summits uses Zoom Server-to-Server OAuth to create the fall 2026 virtual event rooms and Cloudflare Pages Functions to serve shareable event pages.

## Share Routes

Each event has two share route forms:

- `/virtual/ai-executive-readiness`
- `/virtual/ai-executive-readiness.php`
- `/virtual/ai-data-readiness-and-knowledge-strategy`
- `/virtual/ai-data-readiness-and-knowledge-strategy.php`
- `/virtual/ai-use-cases-that-survive-finance`
- `/virtual/ai-use-cases-that-survive-finance.php`
- `/virtual/ai-agents-automation-and-human-handoffs`
- `/virtual/ai-agents-automation-and-human-handoffs.php`
- `/virtual/ai-integration-and-workflow`
- `/virtual/ai-integration-and-workflow.php`
- `/virtual/ai-vendor-strategy-and-platform-decisions`
- `/virtual/ai-vendor-strategy-and-platform-decisions.php`
- `/virtual/ai-security-governance-and-trust`
- `/virtual/ai-security-governance-and-trust.php`
- `/virtual/ai-workforce-talent-and-change-adoption`
- `/virtual/ai-workforce-talent-and-change-adoption.php`
- `/virtual/ai-operating-model-for-2027`
- `/virtual/ai-operating-model-for-2027.php`

The `.php` routes are compatibility share URLs. They are rendered by Cloudflare Pages Functions, not by a PHP runtime.

## Lockout Rule

The public API route `/api/virtual-events/[event-slug]` returns the Zoom join URL only until 15 minutes before the event start time. After the lockout point, it returns the public event details and a locked message, but no Zoom URL.

Each fall 2026 virtual event runs from 1:00 PM to 2:30 PM America/Chicago. The lockout begins at 12:45 PM Central on each event date. Update `functions/_virtual-events.js` if the final event time changes.

## Local Env

Keep `repository.env` ignored and local. Required Zoom values:

- `ZOOM_ACCOUNT_ID`
- `ZOOM_CLIENT_ID`
- `ZOOM_CLIENT_SECRET`

Optional values:

- `ZOOM_USER_ID`, defaults to `me`
- `MOJO_SUMMITS_SETUP_STATE_ID`, required for `--write-kv`
- `MOJO_VIRTUAL_EVENT_TIMEZONE`, defaults to `America/Chicago`

## Creation Flow

Run the local script from the repo root:

```powershell
node scripts/create-zoom-virtual-events.mjs
```

To create one event:

```powershell
node scripts/create-zoom-virtual-events.mjs --event ai-executive-readiness
```

To store the public join URLs in the Cloudflare KV namespace used by the website gate:

```powershell
node scripts/create-zoom-virtual-events.mjs --write-kv
```

To update existing Zoom meetings from the generated local report after changing canonical event details:

```powershell
node scripts/create-zoom-virtual-events.mjs --update-from-report --write-kv
```

The script writes a local generated JSON report at `docs/processes/zoom-virtual-events.generated.json`. That file is ignored because it contains operational meeting links.
