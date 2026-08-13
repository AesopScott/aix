# CRM Taxonomy

Updated: 2026-08-10

## Summary

The canonical Mojo AI Summits taxonomy now lives in `taxonomy.md` at the repository root.

The taxonomy defines:

- Fall 2026 virtual event slugs, labels, dates, formats, and topic-track mapping.
- CRM topic-track values used for contact topic interests.
- CRM field taxonomies for lifecycle stages, registration statuses, strategic roles, and executive functions.

## Implementation Notes

The CRM does not currently read taxonomy values directly from `taxonomy.md`.

Current code touchpoints:

- `functions/api/crm.js` validates contact topic interests through `allowedTopicTracks`.
- `dist/crm/index.html` renders the CRM topic-interest select with `topicTrackOptions`.
- `functions/api/crm.js` provides CRM invite event defaults through `DEFAULT_UPCOMING_EVENTS`.
- `dist/crm/index.html` provides frontend invite fallback events through `fallbackMojoEvents`.
- `functions/_virtual-events.js` provides the runtime virtual event room registry.

When adding or renaming events, update `taxonomy.md` first, then update the CRM/event code paths that still duplicate those values.

## Guest Invite Matrix

Updated: 2026-08-13

The CRM now has a `Guest Matrix` mockup under the Guest pipeline in `dist/crm/index.html`.

The matrix groups guest/member invite links by event and surfaces:

- LinkedIn connection status: whether Mojo/Angel is connected, requested, not connected, declined, or unreachable.
- Registration request status: whether the registration request has not been sent, drafted, sent, reminder sent, bounced, or declined.
- Registration status: whether the guest is not registered, opened, started, registered, waitlisted, or declined.
- Event-level rollups for invited, LinkedIn connected, registration requests sent, registered, and registration requests needed.

Current implementation is a frontend mockup: matrix status edits persist only in browser `localStorage` under `mojoGuestMatrixMockup:v1`. Production persistence still needs backend fields or a CRM activity model for LinkedIn connection state, registration request state, and registration completion state.

When the CRM API is unavailable from a local `file://`, `localhost`, or `127.0.0.1` preview, the CRM falls back to a sample Guest Matrix dataset so the interface can be reviewed without authentication.

