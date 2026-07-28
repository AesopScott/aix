# Mojo AI Summits

Static Cloudflare Pages site for Mojo AI Summits.

- Production: https://mojoaisummits.com/
- Company hub: https://mojoaisummits.com/admin/
- Access console: https://mojoaisummits.com/access/
- Fall 2026 virtual events: https://mojoaisummits.com/virtual/
- Strategic intelligence partners: https://mojoaisummits.com/partner/
- Member registration: https://mojoaisummits.com/member-registration/
- Internal CRM: https://mojoaisummits.com/crm/
- Setup checklist: https://mojoaisummits.com/setup/
- Event playbook: https://mojoaisummits.com/events/
- Internal storage portal: https://mojoaisummits.com/storage/
- Internal budget and P&L: https://mojoaisummits.com/budget/
- Cloudflare Pages project: `mojo-ai-summits`

## Company Hub

The company hub lives at `/admin/` and organizes site routes by access level: Public, Team, and Admin.

The access console lives at `/access/` and stores the global enforcement switch, route access modes, and email allowlist in `MOJO_SUMMITS_SETUP_STATE` under `access-control:config:v1`. Access control is disabled by default, so all pages and APIs remain freely accessible while accounts and page policies are being defined. The page shell is public so users can sign in; saving configuration and managing users require an owner/admin Mojo Auth session.

Authentication is enforced in two layers:

- Mojo Auth users and sessions stored in Cloudflare-hosted app data.
- Pages Functions middleware in `functions/_middleware.js` for route-level access modes.

Access modes:

- `Public`: no Mojo account required.
- `Authenticated`: any active Mojo Auth user may continue.
- `Allowlist`: an active Mojo Auth user must be in the configured allowlist. Owners and admins may continue so they can manage access.
- `Closed`: middleware rejects the route.

These modes are staged until `Enable access control` is turned on in `/access/`.

Protected internal routes:

- `/admin/`
- `/api/access-config`, `/api/access-users`, and `/api/access-invites`
- `/crm/` and `/api/crm`
- `/setup/` and `/api/setup-state`
- `/events/` and `/api/events`
- `/storage/` and `/api/storage`
- `/budget/` and `/api/budget`

Public routes intentionally remain open, including `/`, `/dallas/`, `/virtual/`, `/membership/`, `/fellowships/`, `/partner/`, `/member-registration/`, `/api/invite-request`, `/api/phone-verification`, `/api/member-registration`, and `/crm/api/public/...`.

Mojo Auth endpoints:

- `/api/auth/me`: current user and first-owner setup status.
- `/api/auth/login`: email/password login.
- `/api/auth/logout`: session revocation.
- `/api/auth/invite`: first-owner invite creation, invite preview, and invite acceptance.
- `/api/access-users`: owner/admin user management for `/access`.
- `/api/access-invites`: owner/admin invite creation and revocation for `/access`.
- `/api/access-config`: owner/admin route access configuration for `/access`.

Passwords are stored as PBKDF2-SHA256 hashes with random salts. The raw password is never stored. Sessions are random bearer tokens stored as SHA-256 hashes and sent to the browser in an HttpOnly cookie.

When there are zero users, `/access/` can create the initial owner invite for `scott@mojoaisummits.com` with the temporary `MOJO_AUTH_BOOTSTRAP_TOKEN`. After that, owner/admin users create invites from `/access`. Invite links use random single-use tokens; only token hashes are stored. The full invite URL is returned once when the invite is created, then the invitee opens `/access/?invite=...` to create their own separate Mojo password.

Mojo Auth uses a D1 database bound as `MOJO_AUTH_DB` when available. Until that binding exists, it stores users and sessions in the existing `MOJO_SUMMITS_SETUP_STATE` KV namespace. Apply `migrations/0001_auth.sql` to the D1 database before binding it in production.

For local development only, set `MOJO_ACCESS_ALLOW_OPEN=true` or `MOJO_STORAGE_ALLOW_OPEN=true` in `.dev.vars` to bypass enforced access after the global switch is enabled.

## Internal Storage

The storage portal uses a private Cloudflare R2 bucket bound to Pages Functions as `MOJO_SUMMITS_STORAGE`.

- Bucket: `mojo-summits-private`
- API route: `/api/storage`
- Portal route: `/storage/`
- Access control: `/storage/*` and `/api/storage*` require a Mojo Auth session only after access control is enabled in `/access`.
- Cloudflare prerequisite: R2 must be enabled on the Cloudflare account before the bucket can be created and before this binding can deploy successfully.

## Deploy

GitHub Actions deploys `dist/` to Cloudflare Pages on pushes to `main` and through manual workflow dispatch.

Required GitHub secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

## Member Registration

The member registration page asks for an invite code, then sends guests to `/member-registration/`.
Member registrations are stored in the `MOJO_SUMMITS_SETUP_STATE` KV namespace under `member-registration:*`.
Direct visits to `/member-registration/` are allowed for previewing and sharing the registration page without exposing an invite code in the browser.

## Fall 2026 Virtual Events

The public virtual event series route lives at `/virtual/`.

Confirmed virtual AI event dates:

- September 4, 2026
- September 25, 2026
- October 16, 2026
- November 6, 2026
- November 27, 2026

Shareable Zoom room pages are rendered by Pages Functions at `/virtual/[event-slug]` and `/virtual/[event-slug].php`. The `.php` route exists for share-link compatibility; Cloudflare serves it through the Function runtime rather than a PHP server. The page calls `/api/virtual-events/[event-slug]`, which reads the stored Zoom join URL from `MOJO_SUMMITS_SETUP_STATE` and stops returning it 15 minutes before the event start time.

Create Zoom meetings locally with `scripts/create-zoom-virtual-events.mjs` after adding Zoom Server-to-Server OAuth values to an ignored `repository.env` file:

- `ZOOM_ACCOUNT_ID`
- `ZOOM_CLIENT_ID`
- `ZOOM_CLIENT_SECRET`
- `ZOOM_USER_ID` optional, defaults to `me`
- `MOJO_SUMMITS_SETUP_STATE_ID` for writing join URLs into the Cloudflare KV namespace

The internal `/setup/` checklist includes a repeatable virtual event series scaffold for strategy, platform setup, speaker readiness, audience promotion, live delivery, and follow-up.

## Strategic Intelligence Partners

The public partner page lives at `/partner/` and positions Mojo AI Summits as an executive relationship and intelligence network rather than an event sponsorship seller. It explains Strategic Intelligence Partner value, trust rules, and participation model.

## Executive Intelligence Membership

The public membership page lives at `/membership/` and replaces the former home page `Register` navigation action. It presents the Executive Intelligence Network as an invitation-led, year-round executive community with no application form or request submission flow. The public fellowship pathway page lives at `/fellowships/` and explains the five recognition levels from Executive Member to Founding Fellow, contribution badges, private Executive Impact signals, an annual impact profile concept, and member voting on tier advancement at quarterly summit events.

## Event Playbooks

The internal event playbook generator lives at `/events/`.
Create a playbook by entering the event profile and clicking Generate Event Page.
Generated pages use the slug pattern `/events/[event-name]-[date]/` and are listed in the footer of `/events/`.
In deployed environments, playbooks are stored in `MOJO_SUMMITS_SETUP_STATE`; local static previews fall back to browser `localStorage`.

Phone verification is wired through `/api/phone-verification`. Until an SMS provider is configured, the route records phone status as `pending_sms_setup` and registrations are saved for manual phone confirmation.

To enable AWS SNS SMS verification, configure these Cloudflare Pages environment variables/secrets:

- `SMS_PROVIDER=aws-sns`
- `SMS_PROVIDER_CONFIGURED=true`
- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_SESSION_TOKEN` if the AWS credentials are temporary
- `AWS_SNS_SMS_ORIGINATION_NUMBER` optional, recommended when the account has a dedicated SMS phone number
- `AWS_SNS_SMS_SENDER_ID` optional, only for countries/regions that support sender IDs
- `PHONE_VERIFICATION_SECRET` random app secret for hashing temporary SMS codes

The AWS principal needs permission for `sns:Publish`. If the AWS account is still in the Amazon SNS SMS sandbox, test texts can only be sent to sandbox-verified destination phone numbers.

## CRM

The internal CRM lives at `/crm/` and reads from `/api/crm`.
Member registrations are written to both `member-registration:*` and `crm:member-registrant:*` in `MOJO_SUMMITS_SETUP_STATE`.
The CRM's Member Registrants section includes contact details, roles, food preferences, phone verification status, CRM status, notes, and CSV export.
