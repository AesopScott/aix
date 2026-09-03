# Zoom Events Registration Status Reconciliation

Date: 2026-09-02

## Context

Zoom Events shows `Invited`, `Pre-registered`, and related values in its Manage Registrants registration status column even when Mojo CRM is the source of truth for registration. Those values are Zoom-side access lifecycle labels, not Mojo CRM status values.

## Finding

The likely source of mixed Zoom labels is the migration from split Zoom Events to one Zoom Event with dual sessions. Early records were created under the old mapping, then later records were synced against the new mapping. The local Zoom Events CRM sync fingerprint only considered CRM identity fields and did not include resolved Zoom event, session, or ticket mapping, so old synced rows could be skipped after event topology changed.

## Source Patch

Patched `functions/_zoom-events-crm.js` to:

- Include resolved Zoom event ID, session ID, ticket type ID, show ID, role, and staff role in the sync fingerprint.
- Keep `registration_needed: false` and `fast_join: false` explicit in the Zoom ticket payload instead of deleting false values.
- Bump the Zoom Events sync version to `2026-09-03.2`.

## Operational Next Step

After deployment, run a forced Zoom Events registration reconciliation for the current event roster so all active CRM registrants are provisioned against the current single-event, dual-session configuration. Old split-event Zoom attendee records may still need manual cleanup in Zoom if they remain visible in obsolete events.
