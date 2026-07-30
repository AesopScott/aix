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
- Protected routes: `/schedule-admin/`, `/api/scheduling/admin`.
- Store employee booking profiles, booking records, short TTL holds, and audit metadata in the existing Cloudflare storage pattern.
- Public booking cards can show `photoUrl`; Scott defaults to `/assets/scott-pro3-6.png`.
- Treat the profile's `Calendar Email` as the mailbox where booked events are created.
- Treat `Busy Calendar Emails` as private Microsoft 365 calendars that remove available slots but do not receive created booking events.
- Treat `Busy Calendar URLs` as private read-only iCalendar feeds that remove available slots for alternate calendars.
- Authenticated alternate Microsoft calendars must use the scheduling OAuth connection flow; the app stores encrypted refresh tokens and refreshes server-side to avoid recurring browser login timeouts.
- Authenticated calendar emails are configured one per line, and the admin page generates one row per email with the email, authentication URL, and connect/reconnect button. The OAuth callback verifies the signed-in account matches the requested row.
- Scheduling admin build `2026.07.30.4-auth-rows` added a visible build stamp so stale browser/admin UI loads can be identified quickly.
- Scheduling admin build `2026.07.30.5-auth-row-editor` replaced the authenticated-calendar textarea with an editable row UI. The earlier placeholder looked like a configured email but was not saved data.
- Keep Microsoft app credentials only in environment variables or Cloudflare secrets.
- Do not store or write secrets, Graph tokens, refresh tokens, or OAuth credentials into repo docs, Obsidian notes, logs, or commits.

Implemented first slice:

- Public booking page at `/book/`.
- Protected scheduling admin page at `/schedule-admin/`.
- Public scheduling APIs for team, availability, and booking.
- Protected scheduling admin API for employee profiles.
- Microsoft Graph app-only availability and event creation path, pending Cloudflare/Microsoft credential setup.

Next step: create the Microsoft Entra app registration, grant/scoped calendar access, and add the Graph credential variables to Cloudflare secrets.
