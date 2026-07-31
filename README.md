# Mojo AI Summits

Static Cloudflare Pages site for Mojo AI Summits.

- Production: https://mojoaisummits.com/
- Company hub: https://mojoaisummits.com/admin/
- Access console: https://mojoaisummits.com/access/
- Fall 2026 virtual events: https://mojoaisummits.com/virtual/
- AI Executive Readiness Online: https://mojoaisummits.com/ai-executive-readiness-online/
- Strategic intelligence partners: https://mojoaisummits.com/partners/
- Executive AI intelligence briefs: https://mojoaisummits.com/briefs/
- Public booking: https://mojoaisummits.com/book/
- Member registration: https://mojoaisummits.com/member-registration/
- Guest registration: https://mojoaisummits.com/guest/
- Internal CRM: https://mojoaisummits.com/crm/
- Setup checklist: https://mojoaisummits.com/setup/
- Event playbook: https://mojoaisummits.com/events/
- Internal storage portal: https://mojoaisummits.com/files/
- Scheduling admin: https://mojoaisummits.com/schedule-admin/
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

Scheduling admin access is controlled by the route policy. Assign `/schedule-admin/`, `/api/scheduling/admin`, and `/api/scheduling/oauth` to `Mojo team` in `/access/` when employee schedulers should manage booking profiles without receiving full access-admin privileges.

Protected internal routes:

- `/admin/`
- `/schedule-admin/`
- `/api/access-config`, `/api/access-users`, and `/api/access-invites`
- `/api/scheduling/admin`
- `/api/scheduling/oauth`
- `/crm/` and `/api/crm`
- `/member-profile/` and `/api/member-profile`
- `/partner-profile/` and `/api/partner-profile`
- `/setup/` and `/api/setup-state`
- `/events/` and `/api/events`
- `/storage/` and `/api/storage`
- `/budget/` and `/api/budget`

Public routes intentionally remain open, including `/`, `/dallas/`, `/virtual/`, `/membership/`, `/fellowships/`, `/partners/`, `/briefs/`, `/book/`, `/member-registration/`, `/member-profile/`, `/partner-registration/`, `/guest/`, `/api/scheduling/team`, `/api/scheduling/availability`, `/api/scheduling/book`, `/api/invite-request`, `/api/phone-verification`, `/api/member-registration`, `/api/member-profile`, `/api/partner-registration`, `/api/guest-registration`, and `/crm/api/public/...`.

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
- Portal route: `/files/` (site-managed public shell for the Storage portal)
- Legacy portal route: `/storage/`
- Access control: `/api/storage*` requires a Mojo Auth session only after access control is enabled in `/access`. `/files/` can load the page shell so users can reach site sign-in; Storage data and file operations remain protected by the API.
- Cloudflare prerequisite: R2 must be enabled on the Cloudflare account before the bucket can be created and before this binding can deploy successfully.

## Deploy

GitHub Actions deploys `dist/` to Cloudflare Pages on pushes to `main` and through manual workflow dispatch.

Required GitHub secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

## Member Registration

The member registration page lives at `/member-registration/` and hides the registration form behind a six-digit member invite code. Codes can be passed as `/member-registration/?invite=######`, stored in browser session storage by the home page invite-code modal, or entered directly on the page gate.
Member registrations are stored in the `MOJO_SUMMITS_SETUP_STATE` KV namespace under `member-registration:*` and `crm:member-registrant:*`.
The member profile page lives at `/member-profile/` and uses Mojo Auth login credentials created from the CRM when a member is accepted. The member's login email is always the email address on their CRM registration record. In `/crm/`, use Generate Password on an accepted member registrant to create or reset the Mojo Auth member account, store the current handoff password on the CRM record, and mark the member accepted. For administrative page review only, `/member-profile/?preview=4321` opens a sample profile with non-submitting forms. The profile API shows the member tier, accepted member directory, Discord/member-channel contacts, Mojo staff contacts, member-generated guest show links, new-member nomination links, and fellowship progression tracking.
CRM-generated and member-generated guest codes are stored under `crm:guest-invite-code:######` and open `/guest/?invite=######`. Member nomination codes are stored under `crm:member-invite-code:######` and open `/member-registration/?invite=######`. Member nomination links are limited to two per member per month in the profile API; when `MOJO_MEMBER_INVITE_CODES_STRICT=true`, only stored active member codes unlock registration.
Fellowship progression is based on system-trackable fields only: profile completeness, good-standing status, sessions attended, summits attended, documented contributions, peer promotion nominations, and votes. There is no minimum time requirement. Members opt in to being considered with the `openToFellowshipNomination` checkbox on their profile. Fellowship promotion nominations are stored under `crm:fellowship-nomination:*`; only current accepted members can nominate another member, self-nomination is blocked, and the API only lists candidates who meet the technical requirements for their next level. Nomination windows open 30 days before each quarterly summit; configure actual summit dates with `MOJO_FELLOWSHIP_SUMMIT_DATES` as comma-separated `YYYY-MM-DD` values, otherwise the system uses quarter-end fallback dates. Distinguished Fellow nominations require extra review evidence fields for members to evaluate before voting. Approval thresholds are majority approval for Contributing Fellow, two-thirds for Senior Fellow, and three-fourths for Distinguished Fellow. Senior Fellows are eligible for paid speaking opportunities, and Distinguished Fellows receive priority consideration for paid speaking opportunities.
Registration records include name, company, title, industry, company email, phone, phone verification status, and separate publication-use opt-ins for name and company.
The protected CRM reads upcoming generated event pages from `event-playbooks:index`. Staff select an event when creating guest, member, or partner invite links; the invite record stores `eventSlug`, `eventName`, and `eventDate`, and successful registrations inherit those fields. Generated event pages display a registrant roster for records tied to the event.
Invite link rows in the CRM can be deleted, and used links show `Used by` with the registrant name when available plus `Used for` with the selected event. Member profile invite history uses the same labels, and members can delete links they generated themselves.

## Guest Registration

The guest registration page uses the same form flow as member registration and lives at `/guest/`.
Guest registration submissions are routed through `/crm/api/public/guest-registration`.
Direct visits to `/guest/` are allowed for previewing and sharing the registration page without exposing an invite code in the browser.
Legacy `/vip-registration/?invite=######` CRM links redirect to `/guest/?invite=######` so existing invite links continue to work.

## Partner Registration

The partner registration page lives at `/partner-registration/`, but it is intentionally hidden from public navigation and public site route listings. Attendees should only open it from CRM-generated links using `/partner-registration/?invite=######`. For administrative page review and the private company hub, `/partner-registration/?preview=4321` opens the form in non-submitting preview mode.
Partner invite codes are generated inside the protected CRM and stored under `crm:partner-invite-code:######` with event metadata such as event name, event date, partner company, partner contact email, and partner tier. Partner registration submissions are routed through `/crm/api/public/partner-registration`, stored under `partner-registration:*` and `crm:partner-registrant:*`, and marked against the single-use partner invite code.

## Fall 2026 Virtual Events

The public virtual event series route lives at `/virtual/`.

The dedicated page for the first session lives at `/ai-executive-readiness-online/`. It positions the Friday, September 4, 2026 AI Executive Readiness event as an invitation-only moderated virtual roundtable for nine executives around adoption momentum, frontier model movement, AI value measurement, organizational ownership, AI output chain of custody, human review, workforce fear, and regulation.

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

The public partners page lives at `/partners/` and positions Mojo AI Summits as an executive relationship and intelligence network rather than an event sponsorship seller. It explains Strategic Intelligence Partner value, Partner Candidate entry, Council Partner, Intelligence Partner, Summit Partner, Founding Partner, trust rules, and participation model.

The private partner profile page lives at `/partner-profile/` and is backed by `/api/partner-profile`. Partner profiles are company-based, not individual-user-based. A partner contact signs in with the email address from their CRM registration record and a generated password that staff manually provide. In `/crm/`, use Generate Password or Reset Password on a partner registrant to create or update the Mojo Auth login, store the current handoff password on the CRM partner record, add the email to the `partners` access group, and connect the contact to `partner-contact:{email}` plus `partner-company:{company-slug}`. For administrative page review only, `/partner-profile/?preview=4321` opens a sample company profile without live partner data. A signed-in partner contact resolves to a company profile through `partner-contact:{email}`, contacts listed on a company profile record, or legacy email profile records. The API refuses accounts that are not connected to a partner company profile. The page shows the company tier, all known contacts for that company, events attended by any known contact from that company, every known member/guest/partner attendee from those events with name/email/company/title, publication placements once the publication system is linked, and sponsorship contribution totals. Preferred company profile records use `partner-company:{company-slug}` or `partner-profile-company:{company-slug}` in `MOJO_SUMMITS_SETUP_STATE`; profile records can include `contacts`, `events` or `attendedEvents`, `publications`, and `sponsorships`, `contributions`, or `payments`.

## Sponsor Curation Engine

The sponsor curation engine process lives at `docs/processes/sponsor-curation-engine.md`, with a starter machine-readable config at `docs/processes/sponsor-curation-engine.generated.json`, a CSV tracker template at `docs/processes/sponsor-curation-tracker-template.csv`, a researched seed prospect file at `docs/processes/sponsor-curation-seed-prospects.csv`, a generated priority report at `docs/processes/sponsor-curation-seed-score-report.generated.json`, and a local scoring script at `scripts/score-sponsor-prospects.mjs`.

The engine is designed to identify AI-enabled companies with evidence of event sponsorship, partner-market behavior, or field-marketing activity, then route qualified companies into Strategic Intelligence Partner and sponsor outreach. It uses a 100-point score across AI relevance, event sponsorship behavior, executive audience fit, Mojo model fit, commercial readiness, and contactability. Research should expand the prospect universe; the marketing team should review priority accounts, assign owners, and run approved outreach. Human review is required before first outreach, proposal, and partner acceptance.

## Executive Intelligence Membership

The public membership page lives at `/membership/` and replaces the former home page `Register` navigation action. It presents the Executive Intelligence Network as an invitation-only, year-round executive community with no application form or request submission flow. The page emphasizes that membership is not pay-to-play but contribute-to-connect: money cannot buy entry or continued standing, and membership is earned through contribution to the group, community, and industry. Membership is by invitation from existing members, each member has two invitations per month, members are expected to make those invitations thoughtfully, and invitation activity is part of contribution tracking. The public fellowship pathway page lives at `/fellowships/` and explains the four recognition levels from Fellow to Distinguished Fellow, contribution badges, private Executive Impact signals, an annual impact profile concept, and member voting on tier advancement at quarterly summit events.

## Executive AI Intelligence Briefs

The public briefs archive lives at `/briefs/`. The first sample brief, `/briefs/ai-innovation-at-operating-scale/`, presents the Mojo AI Summits Executive Research Council on AI Innovation as a full multipage HTML report with PDF download/open actions for `/assets/briefs/ai-innovation-at-operating-scale.pdf`. The generator script `scripts/generate-ai-innovation-brief.py` writes the HTML routes and the PDF to both `dist/assets/briefs/` for the site and `output/pdf/` for local artifact review. Public footers on the main site pages link to `/briefs/`.

## Event Playbooks

The internal event playbook generator lives at `/events/`.
Create a playbook by entering the event profile and clicking Generate Event Page.
Generated pages use the slug pattern `/events/[event-name]-[date]/` and are listed in the footer of `/events/`.
In deployed environments, playbooks are stored in `MOJO_SUMMITS_SETUP_STATE`; local static previews fall back to browser `localStorage`.

Phone verification is wired through `/api/phone-verification`. Until an SMS provider is configured, the route records phone status as `pending_sms_setup` and registrations are saved for manual phone confirmation.

To enable AWS SMS verification, configure these Cloudflare Pages environment variables/secrets. The verification API sends through AWS End User Messaging SMS v2 first and falls back to SNS only when no origination identity is configured:

- `SMS_PROVIDER=aws-sns`
- `SMS_PROVIDER_CONFIGURED=true`
- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_SESSION_TOKEN` if the AWS credentials are temporary
- `AWS_SNS_SMS_ORIGINATION_NUMBER` optional, recommended when the account has a dedicated SMS phone number; used as the v2 `OriginationIdentity`
- `AWS_SNS_SMS_SENDER_ID` optional, only for countries/regions that support sender IDs
- `PHONE_VERIFICATION_SECRET` random app secret for hashing temporary SMS codes

The AWS principal needs permission for `sms-voice:SendTextMessage`; keep `sns:Publish` if SNS fallback support is needed. If the AWS account is still in the Amazon SNS SMS sandbox, test texts can only be sent to sandbox-verified destination phone numbers.

## CRM

The internal CRM lives at `/crm/` and reads from `/api/crm`.
Member registrations are written to both `member-registration:*` and `crm:member-registrant:*` in `MOJO_SUMMITS_SETUP_STATE`.
The CRM's Member Registrants section includes contact details, roles, phone verification status, CRM status, notes, and CSV export.
