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

