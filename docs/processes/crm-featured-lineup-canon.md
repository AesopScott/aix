# CRM Featured Lineup Canon

## Rule

The CRM is the source of truth for public featured lineups.

- Each active event time slot can publish at most 6 Featured Guests, 1 Featured Author,
  and 2 Featured Sponsors/Partners.
- Featured Guest assignments are tracked per actual event and per active show time.
- Morning shows are canceled; the active show time is the afternoon show.
- A Featured Guest can appear on the public website only when there is an actual CRM registration record for that person and event.
- Invite links, contact event history, and matrix-only prospects can support CRM workflow tracking, but they do not publish someone to the website lineup by themselves.
- If an invite or contact record disagrees with the current CRM registration/matrix state, the CRM registration/matrix state wins.
- Do not add hardcoded role allowlists or event roster locks to the public API. If the public lineup is wrong, correct the CRM record that made it wrong.

## Implementation Notes

- The CRM API enforces the 6-person Featured Guest capacity when matrix, invite, registration, or contact event role/show changes are saved for the active afternoon show.
- The public virtual event API filters featured lineup candidates to submitted registration rows plus registered/attended CRM contact-event rows before applying separate public slot limits for featured guests, authors, and sponsors/partners. The legacy aggregate `featuredGuests` list is flattened from those show-level lineups.
- Actual guest/member registration rows are treated as registered even when older raw status values such as `new`, `pending-engagement`, `confirmed`, or `invited` remain on the stored record.
- Inactive statuses such as `declined`, `bad-fit`, `no-show`, and `canceled` are not eligible for the public lineup.
- The September 4, 2026 AI Executive Readiness Alex Lovo issue was corrected in CRM. The API must continue to derive public roles from CRM-only eligibility rules.
