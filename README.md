# Mojo AI Summits

Static Cloudflare Pages site for Mojo AI Summits.

- Production: https://mojoaisummits.com/
- Company hub: https://mojoaisummits.com/admin/
- Access console: https://mojoaisummits.com/access/
- Fall 2026 virtual events: https://mojoaisummits.com/virtual/
- VIP registration: https://mojoaisummits.com/vip-registration/
- Internal CRM: https://mojoaisummits.com/crm/
- Setup checklist: https://mojoaisummits.com/setup/
- Event playbook: https://mojoaisummits.com/events/
- Internal storage portal: https://mojoaisummits.com/storage/
- Internal budget and P&L: https://mojoaisummits.com/budget/
- Cloudflare Pages project: `mojo-ai-summits`

## Company Hub

The company hub lives at `/admin/` and lists company-only routes that should not appear in the public site navigation.

The access console lives at `/access/` and stores route access modes plus the email allowlist in `MOJO_SUMMITS_SETUP_STATE` under `access-control:config:v1`. The page shell is public so users can sign in; the configuration and user-management APIs require an owner/admin Mojo Auth session.

Authentication is enforced in two layers:

- Mojo Auth users and sessions stored in Cloudflare-hosted app data.
- Pages Functions middleware in `functions/_middleware.js` for route-level access modes.

Access modes:

- `Public`: no Mojo account required.
- `Authenticated`: any active Mojo Auth user may continue.
- `Allowlist`: an active Mojo Auth user must be in the configured allowlist. Owners and admins may continue so they can manage access.
- `Closed`: middleware rejects the route.

Protected internal routes:

- `/admin/`
- `/api/access-config` and `/api/access-users`
- `/crm/` and `/api/crm`
- `/setup/` and `/api/setup-state`
- `/events/` and `/api/events`
- `/storage/` and `/api/storage`
- `/budget/` and `/api/budget`

Public routes intentionally remain open, including `/`, `/dallas/`, `/virtual/`, `/vip-registration/`, `/api/invite-request`, `/api/phone-verification`, `/api/vip-registration`, and `/crm/api/public/...`.

Mojo Auth endpoints:

- `/api/auth/me`: current user and bootstrap status.
- `/api/auth/login`: email/password login.
- `/api/auth/logout`: session revocation.
- `/api/auth/bootstrap`: first owner creation, guarded by `MOJO_AUTH_BOOTSTRAP_TOKEN`.
- `/api/access-users`: owner/admin user management for `/access`.
- `/api/access-config`: owner/admin route access configuration for `/access`.

Passwords are stored as PBKDF2-SHA256 hashes with random salts. The raw password is never stored. Sessions are random bearer tokens stored as SHA-256 hashes and sent to the browser in an HttpOnly cookie.

Mojo Auth uses a D1 database bound as `MOJO_AUTH_DB` when available. Until that binding exists, it stores users and sessions in the existing `MOJO_SUMMITS_SETUP_STATE` KV namespace. Apply `migrations/0001_auth.sql` to the D1 database before binding it in production.

For local development only, set `MOJO_ACCESS_ALLOW_OPEN=true` or `MOJO_STORAGE_ALLOW_OPEN=true` in `.dev.vars`.

## Internal Storage

The storage portal uses a private Cloudflare R2 bucket bound to Pages Functions as `MOJO_SUMMITS_STORAGE`.

- Bucket: `mojo-summits-private`
- API route: `/api/storage`
- Portal route: `/storage/`
- Access control: `/storage/*` and `/api/storage*` require a Mojo Auth session unless route access is changed in `/access`.
- Cloudflare prerequisite: R2 must be enabled on the Cloudflare account before the bucket can be created and before this binding can deploy successfully.

## Deploy

GitHub Actions deploys `dist/` to Cloudflare Pages on pushes to `main` and through manual workflow dispatch.

Required GitHub secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

## VIP Registration

The home page registration action asks for an invite code, then sends guests to `/vip-registration/`.
VIP registrations are stored in the `MOJO_SUMMITS_SETUP_STATE` KV namespace under `vip-registration:*`.
Direct visits to `/vip-registration/` are allowed for previewing and sharing the registration page without exposing an invite code in the browser.

## Fall 2026 Virtual Events

The public virtual event series route lives at `/virtual/`.

Confirmed virtual AI event dates:

- September 4, 2026
- September 25, 2026
- October 16, 2026
- November 6, 2026
- November 27, 2026

The internal `/setup/` checklist includes a repeatable virtual event series scaffold for strategy, platform setup, speaker readiness, audience promotion, live delivery, and follow-up.

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
VIP registrations are written to both `vip-registration:*` and `crm:vip-registrant:*` in `MOJO_SUMMITS_SETUP_STATE`.
The CRM's VIP Registrants section includes contact details, roles, food preferences, phone verification status, CRM status, notes, and CSV export.
