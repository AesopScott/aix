# Employee Scheduling System

Date: 2026-07-29

Mojo should build its Calendly-like employee booking feature around Microsoft 365 calendar access, not around employee browser sessions.

The timeout issue from the previous attempt was likely caused by tying booking availability or calendar writes to short-lived user sessions or delegated access tokens. The desired behavior is a server-side scheduling engine: visitors can book without logging in, employees manage their profiles behind Mojo Auth, and the Cloudflare worker talks to Microsoft Graph independently.

Preferred integration:

- Microsoft Graph app-only calendar access.
- Exchange Online RBAC for Applications scoped to approved booking mailboxes.
- `getSchedule` for free/busy checks.
- Calendar event creation under the selected employee mailbox after a final availability re-check.

Implementation notes:

- Public routes: `/book/`, `/api/scheduling/team`, `/api/scheduling/availability`, `/api/scheduling/book`.
- Protected team routes: `/schedule-admin/`, `/api/scheduling/admin`, and `/api/scheduling/oauth`.
- Store employee booking profiles, booking records, short TTL holds, and audit metadata in the existing Cloudflare storage pattern.
- Public booking cards can show `photoUrl`; Scott defaults to `/assets/images/scott-pro3-6.png`.
- Team profile photos should be stored in source under `assets/images/` and deployed under `/assets/images/{file}.png`. Default scheduler photo paths now use that convention for known team slugs: angel, charlie, gina, jodi, robert, ron, and scott.
- Treat the profile's `Calendar Email` as the mailbox where booked events are created.
- Treat `Busy Calendar Emails` as private Microsoft 365 calendars that remove available slots but do not receive created booking events.
- Treat `Busy Calendar URLs` as private read-only iCalendar feeds that remove available slots for alternate calendars.
- Alternate calendars must be read-only busy-time sources. They must never require write/admin access in another tenant.
- Authenticated alternate Microsoft calendars use delegated OAuth with `Calendars.Read`; the app stores encrypted refresh tokens and refreshes server-side to avoid recurring browser login timeouts. This only works when the external tenant allows user/admin consent for the Mojo app.
- Published calendar feed URLs are the no-consent fallback for outside tenants. The app reads those `.ics`/`webcal` feeds and subtracts busy time from availability.
- Authenticated calendar emails are configured one per row, and the admin page generates one read authentication URL per email. The OAuth callback verifies the signed-in account matches the requested row.
- Blind calendar invite emails are mirror/copy calendar addresses. The booking event is created on the Mojo calendar, those addresses are added as optional attendees, and Microsoft Graph `hideAttendees` is enabled so invitees only see themselves instead of the full mirror list.
- Availability must always treat confirmed local booking records as busy time, independent of Microsoft Graph readback. This prevents already-booked slots from staying visible when Graph or KV readback is delayed.
- The booking page also removes the selected slot client-side immediately after a successful booking response.
- Starting 2026-09-08, Angel's `/book` availability is constrained in code to 8:30 AM-1:30 PM America/Chicago, regardless of broader stored profile hours.
- Scheduling admin build `2026.07.30.4-auth-rows` added a visible build stamp so stale browser/admin UI loads can be identified quickly.
- Scheduling admin build `2026.07.30.5-auth-row-editor` replaced the authenticated-calendar textarea with an editable row UI. The earlier placeholder looked like a configured email but was not saved data.
- Scheduling admin build `2026.07.31.2-read-calendars` split external calendars into Microsoft read connections and published feed URL rows.
- Scheduling admin build `2026.07.31.3-blind-invites` added profile-level blind calendar invite emails for private calendar invite mirroring.
- Scheduling admin access is governed by `/access/` route policy. The page, admin API, and OAuth start endpoint can be assigned to `Mojo team`; the scheduling APIs trust the middleware-approved route access instead of requiring site owner/admin role.
- On 2026-07-31, the Mojo Scheduling Entra app was changed to multi-tenant (`AzureADMultipleOrgs`) and the Web redirect URI `https://mojoaisummits.com/api/scheduling/oauth/callback` was added. This fixed the earlier external-tenant `AADSTS700016` and `AADSTS900971` failures.
- The CMC test account `sschindler@cmcenters.org` then reached Microsoft sign-in successfully, but CMC blocked consent with "Approval required" for the unverified Mojo Scheduling app. That is an external tenant consent policy block, not a Mojo login/session timeout. Options are CMC admin approval, Microsoft publisher verification plus permissive CMC consent policy, or published `.ics` calendar feed fallback.
- Keep Microsoft app credentials only in environment variables or Cloudflare secrets.
- Do not store or write secrets, Graph tokens, refresh tokens, or OAuth credentials into repo docs, Obsidian notes, logs, or commits.

Implemented first slice:

- Public booking page at `/book/`.
- Protected team scheduling admin page at `/schedule-admin/`.
- Public scheduling APIs for team, availability, and booking.
- Protected team scheduling admin API for employee profiles.
- Microsoft Graph app-only availability and event creation path, pending Cloudflare/Microsoft credential setup.

Next step: create the Microsoft Entra app registration, grant/scoped calendar access, and add the Graph credential variables to Cloudflare secrets.
