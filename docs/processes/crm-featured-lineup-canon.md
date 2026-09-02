# CRM Featured Lineup Canon

## Rule

The CRM is the source of truth for public featured lineups.

- Each event time slot can have at most 6 Featured Guest assignments.
- Featured Guest assignments are tracked per actual event and per show time.
- Morning and afternoon are separate time slots.
- A Featured Guest can appear on the public website only when there is an actual CRM registration record for that person and event.
- Invite links, contact event history, and matrix-only prospects can support CRM workflow tracking, but they do not publish someone to the website lineup by themselves.
- If an invite or contact record disagrees with the current CRM registration/matrix state, the CRM registration/matrix state wins.

## Implementation Notes

- The CRM API enforces the 6-person Featured Guest capacity when matrix, invite, registration, or contact event role/show changes are saved.
- The public virtual event API filters featured lineup candidates to CRM registration records before applying the public 6-person slot limit.
- Actual guest/member registration rows are treated as registered even when older raw status values such as `new`, `pending-engagement`, `confirmed`, or `invited` remain on the stored record.
- Inactive statuses such as `declined`, `bad-fit`, `no-show`, and `canceled` are not eligible for the public lineup.
