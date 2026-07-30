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
- Keep Microsoft app credentials only in environment variables or Cloudflare secrets.
- Do not store or write secrets, Graph tokens, refresh tokens, or OAuth credentials into repo docs, Obsidian notes, logs, or commits.

Implemented first slice:

- Public booking page at `/book/`.
- Protected scheduling admin page at `/schedule-admin/`.
- Public scheduling APIs for team, availability, and booking.
- Protected scheduling admin API for employee profiles.
- Microsoft Graph app-only availability and event creation path, pending Cloudflare/Microsoft credential setup.

Next step: create the Microsoft Entra app registration, grant/scoped calendar access, and add the Graph credential variables to Cloudflare secrets.
