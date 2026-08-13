# Setup State Persistence

Updated: 2026-08-13

The `/setup/` page stores checklist edits in two layers:

- Browser `localStorage` for immediate local durability.
- Cloudflare KV binding `MOJO_SUMMITS_SETUP_STATE`, key `master-event-execution-checklist`, for shared production state.

As of 2026-08-13, failed shared writes are queued in `localStorage` under `mojo-event-pending-shared-sync`. The setup page retries that queue on the normal 5-second shared sync loop and pauses remote polling while pending local writes remain unsent, so older shared KV state does not overwrite unsynced local edits.

Operationally, local Wrangler preview and the live website are separate persistence environments. Local preview writes local Miniflare KV state unless a separate remote KV sync is run. Production persistence happens through the live `/api/setup-state` endpoint or a deliberate remote KV update.
