# Mojo Employee Scheduling System

Last updated: 2026-07-29

## Decision

Build a Calendly-like booking flow into the Mojo AI Summits website, backed by Microsoft 365 calendars.

The production design should not require employees to keep website sessions alive for calendar reads or booking writes. Mojo company email is Microsoft 365 with Exchange Online, so the preferred integration is Microsoft Graph with app-only calendar access scoped to the booking team mailboxes through Exchange Online RBAC for Applications.

## Why The Previous Version Timed Out

The timeout problem usually happens when calendar access is tied to the employee's browser session or a short-lived delegated access token. Access tokens are intentionally short lived. A Calendly-style system avoids that by keeping calendar connectivity server-side and refreshing or using app-only credentials without asking the user to sign in during routine booking.

For Mojo, the safer path is:

- Public visitors browse employees, choose a meeting type, select a slot, and submit booking details without authenticating.
- The worker checks real availability server-side.
- The worker creates the calendar event server-side.
- Employees authenticate only to manage their booking profile and rules, not to keep the booking engine alive.

## Recommended Architecture

Use Cloudflare Pages Functions plus the existing `MOJO_SUMMITS_SETUP_STATE` storage pattern for configuration and booking records. Use Microsoft Graph for calendar availability and event creation.

Core routes:

- `/book/`: public booking page.
- `/api/scheduling/team`: public list of bookable employees and meeting types.
- `/api/scheduling/availability`: public availability lookup with server-side throttling and validation.
- `/api/scheduling/book`: public booking creation endpoint with spam/rate controls.
- `/schedule-admin/`: protected Mojo Auth admin page for employees/admins.
- `/api/scheduling/admin`: protected employee/admin settings endpoint.

Core records:

- `scheduling:employee:{slug}`: employee profile, email, active status, working hours, buffers, timezone, and meeting types.
- `scheduling:booking:{date}:{id}`: booking request and confirmed Microsoft event IDs.
- `scheduling:hold:{slot}:{id}`: short TTL temporary holds to prevent double booking during form submission.
- `scheduling:audit:{date}:{id}`: admin actions and Graph operation summaries without secrets.

Microsoft Graph integration:

- Use `getSchedule` to read free/busy for a selected employee.
- Use `POST /users/{employeeEmail}/calendar/events` to create the event.
- Request only the calendar permissions needed for booking.
- Scope app access to approved Mojo booking mailboxes using Exchange Online RBAC for Applications.

## Anti-Timeout Rules

- Do not use the Mojo Auth cookie as the calendar credential.
- Do not require an employee to be online for a visitor to book them.
- Do not store raw delegated refresh tokens unless app-only access is unavailable.
- If delegated OAuth is ever needed, request `offline_access`, store refresh tokens encrypted, rotate refresh tokens when Microsoft returns new ones, and treat token loss as a reconnect state, not a public booking failure.
- Cache available slots briefly, but re-check availability immediately before creating the event.

## Security And Operational Boundaries

- Keep Microsoft tenant ID, client ID, and client secret in Cloudflare environment variables or secrets only.
- Never commit OAuth secrets, refresh tokens, Graph access tokens, webhook secrets, or temporary credentials.
- Use a dedicated Microsoft Entra app registration for scheduling.
- Restrict Graph app access to the smallest mailbox set possible.
- Log only non-secret operation metadata such as employee slug, booking ID, event ID, status, and timestamps.
- Add rate limiting or Turnstile before opening public booking broadly.

## Implemented First Slice

- Public `/book/` page.
- Protected `/schedule-admin/` page.
- Public `/api/scheduling/team`, `/api/scheduling/availability`, and `/api/scheduling/book` endpoints.
- Protected `/api/scheduling/admin` endpoint for owner/admin employee profile management.
- Microsoft Graph app-only token acquisition, free/busy lookup, and event creation path.
- Short TTL slot holds, final availability re-check, a basic KV rate check, and form honeypot.

## Remaining Setup

1. Create the Microsoft Entra app registration.
2. Grant and admin-consent the calendar permissions needed for booking.
3. Scope Exchange Online app access to approved booking mailboxes through RBAC for Applications.
4. Add `MOJO_MS_TENANT_ID`, `MOJO_MS_CLIENT_ID`, and `MOJO_MS_CLIENT_SECRET` to Cloudflare secrets.
5. Add Turnstile before broad public promotion.
6. Add confirmation email later if needed.

## Microsoft References

- OAuth access tokens are short lived and are refreshed through the token endpoint with a refresh token: https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow
- `offline_access` grants extended delegated access when a user-consented model is required: https://learn.microsoft.com/en-us/entra/identity-platform/scopes-oidc
- Exchange Online RBAC for Applications can scope app calendar access to selected mailboxes: https://learn.microsoft.com/en-us/exchange/permissions-exo/application-rbac
- Microsoft Graph `getSchedule` returns free/busy availability: https://learn.microsoft.com/en-us/graph/api/calendar-getschedule
- Microsoft Graph can create calendar events for a user calendar: https://learn.microsoft.com/en-us/graph/api/calendar-post-events
- `Calendars.ReadWrite` application permission can create, read, update, and delete calendar events without a signed-in user after admin consent: https://learn.microsoft.com/en-us/graph/permissions-reference
