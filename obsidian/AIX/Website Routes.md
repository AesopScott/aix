# Website Routes

## Company Hub

- Route: `/admin/`
- Source file: `dist/admin/index.html`
- Purpose: company hub for Mojo AI Summits routes grouped by access level.
- Public space: `/`, `/dallas/`, `/ai-executive-readiness-online/`, `/virtual/`, `/membership/`, `/fellowships/`, `/partners/`, `/briefs/`, `/book/`, `/member-registration/`, `/guest/`, `/privacy/`, and `/sms-terms/`.
- Member space: `/member-profile/?preview=4321` for administrative review of the member profile experience.
- Partner space: `/partner-registration/?preview=4321` for administrative review of hidden partner registration, plus `/partner-profile/` for approved partner contacts.
- Team space: `/setup/`, `/events/`, `/crm/`, `/schedule-admin/`, `/files/` for the Storage portal, and `/storage/` as the legacy Storage route.
- Admin space: `/access/` and `/budget/`.
- Routing support: `/admin` redirects to `/admin/`; no-cache headers are configured for `/admin` and `/admin/*`.
- Guest registration compatibility: legacy `/vip-registration/?invite=######` CRM links redirect to `/guest/?invite=######` so existing invite links continue to work while the public language uses guest registration.
- Registration access: `/member-registration/` is public to load but hides the registration form behind a six-digit member invite code. The home page modal, `?invite=######`, session storage, or direct code entry can unlock it after `/crm/api/public/member-invite-codes/######` validation. The member profile generator writes single-use nomination codes under `crm:member-invite-code:######`; `MOJO_MEMBER_INVITE_CODES_STRICT=true` makes stored active codes mandatory. `/member-profile/?preview=4321` opens the administrative sample member profile with non-submitting forms. `/partner-registration/` is stricter: it unlocks only from a CRM-generated `?invite=######` link backed by a stored `crm:partner-invite-code:######` record. `/partner-registration/?preview=4321` is the administrative non-submitting preview link.
- Registration data model: member and guest registration collect name, company, title, industry, company email, phone, role selections, food preferences, phone verification status, and separate publication-use opt-ins for name and company. Title and industry do not have publication opt-ins.
- Event-tied invite codes: `/crm/` reads upcoming generated event pages from `event-playbooks:index`. Staff select an event when generating guest, member, or partner invite links. Guest/member codes are stored under `crm:guest-invite-code:######` and `crm:member-invite-code:######`; partner codes remain under `crm:partner-invite-code:######`. Registration submissions copy `eventSlug`, `eventName`, and `eventDate` from the invite code into the CRM registrant record, and `/events/[slug]/` shows an event registrant roster for matching member, guest, and partner records.
- Invite link management: CRM invite rows include delete controls. Used invite rows display `Used by` with the registrant name when available and `Used for` with the event. Member profile invite history follows the same label pattern and allows the signed-in member to delete links they generated.
- Virtual event route: `/ai-executive-readiness-online/` is the dedicated public page for the Friday, September 4, 2026 AI Executive Readiness Online session. It presents an invitation-only moderated roundtable for nine executives and links into `/book/` for executive invitation requests.
- Access guidance: access control is disabled by default while accounts and page policies are being defined. When enabled in `/access/`, protect `/admin/`, `/crm/`, `/partner-profile/`, `/setup/`, `/events/`, `/schedule-admin/`, `/storage/`, `/budget/`, and internal APIs `/api/crm`, `/api/partner-profile`, `/api/setup-state`, `/api/events`, `/api/scheduling/admin`, `/api/scheduling/oauth`, `/api/storage`, and `/api/budget` with Mojo Auth route modes. Scheduling admin routes may be assigned to `Mojo team` so employee schedulers can manage booking profiles without full access-admin privileges. `/member-profile/` and `/api/member-profile` remain public at the route-control layer so members see the member login page, but `/api/member-profile` requires an accepted Mojo Auth member session before returning directory or invite data. `/files/` is the site-managed Storage portal shell and stays reachable so users can get to site sign-in; file data and operations remain protected by `/api/storage`. `/storage/` may still be intercepted by external Cloudflare Access until that rule is removed. `/access/` is the public login/configuration shell; `/api/access-config`, `/api/access-users`, and `/api/access-invites` require an owner/admin Mojo Auth session for mutations, user management, and invite creation. `/api/auth/invite` stays public so invitees can accept single-use links and create separate Mojo passwords. Keep `/crm/api/public/...` public for invite-code lookup and guest registration callbacks.

## Member Profile

- Route: `/member-profile/`
- Source file: `dist/member-profile/index.html`
- API route: `/api/member-profile`
- Purpose: private accepted-member dashboard showing tier, system-trackable fellowship progress, nomination consent, fellowship promotion nominations, member voting, guest show invite generation, new-member nomination generation, accepted member directory, Discord/member-channel contacts, Mojo staff contacts, and tier contribution guidance.
- Admin preview: `/member-profile/?preview=4321` opens a sample profile for visual review and page editing checks; invite, nomination, preference, and voting forms do not submit in preview mode.
- CRM workflow: from `/crm/`, staff can mark a member registrant accepted, generate or reset the member password, and manually provide that password to the member. The password is stored on the CRM member record for handoff and is also installed into Mojo Auth for `/member-profile/` login.
- Storage model: accepted member records are read from `crm:member-registrant:*` with `member-registration:*` fallback. Guest invite links are stored as `crm:guest-invite-code:######` and open `/guest/?invite=######`. New-member nomination links are stored as `crm:member-invite-code:######` and open `/member-registration/?invite=######`. Fellowship promotion nominations are stored as `crm:fellowship-nomination:*`.
- Nomination policy: new-member nomination links remain limited to two per accepted member per month. Fellowship promotion eligibility is computed by the profile API from trackable fields only: profile completeness, good-standing status, sessions attended, summits attended, documented contributions, peer promotion nominations, and votes. There is no minimum time requirement and no human eligibility verification step. Members opt in with `openToFellowshipNomination`; only another current accepted member can nominate them, self-nomination is blocked, and the API opens nominations 30 days before quarterly summits using `MOJO_FELLOWSHIP_SUMMIT_DATES` or quarter-end fallback dates. Distinguished Fellow nominations require extra review evidence fields for member evaluation. Approval thresholds are majority for Contributing Fellow, two-thirds for Senior Fellow, and three-fourths for Distinguished Fellow. Senior Fellows are eligible for paid speaking opportunities, and Distinguished Fellows receive priority consideration for paid speaking opportunities.

## Strategic Intelligence Partners

- Route: `/partners/`
- Source file: `dist/partners/index.html`
- Purpose: public Strategic Intelligence Partners page that explains Mojo as an executive relationship and intelligence network for vendor leaders, not an event sponsorship seller, with partner tiers from Partner Candidate through Council Partner, Intelligence Partner, Summit Partner, and Founding Partner.
- Routing support: `/partners` redirects to `/partners/`; legacy `/partner`, `/partner/`, and `/partner.html` redirect to `/partners/`; no-cache headers are configured for `/partners` and `/partners/*`.

## Partner Profile

- Route: `/partner-profile/`
- Source file: `dist/partner-profile/index.html`
- API route: `/api/partner-profile`
- Purpose: private company-level partner dashboard showing tier, company contacts, events attended by any known contact for that company, attendee relationships from those events, publication placements once the publication system is linked, and sponsorship contribution totals.
- Access workflow: partner contacts sign in with the email address from their CRM registration record and a generated password that staff manually provide. In `/crm/`, Generate Password or Reset Password on a partner registrant creates or updates the Mojo Auth login, stores the current handoff password on the CRM partner record, adds the email to the `partners` access group, and connects the contact to `partner-contact:{email}` plus `partner-company:{company-slug}`. The API refuses accounts that are not connected to a partner company profile.
- Storage model: partner profiles are company-based, not individual-user-based. Preferred records use `partner-company:{company-slug}` or `partner-profile-company:{company-slug}` in `MOJO_SUMMITS_SETUP_STATE`; contact mapping can use `partner-contact:{email}` or `partner-profile-contact:{email}`. Legacy `partner-profile:{email}` and `partner:{email}` records are still read as fallbacks. Profile records can include `contacts`, `events` or `attendedEvents`, `publications`, and `sponsorships`, `contributions`, or `payments`.
- Event and attendee matching: the API finds all known company contacts from profile contacts plus partner/member/guest registration rows with the same company. Events attended by any of those contacts are shown, and each event lists every known member, guest, or partner attendee whose `eventId`, `eventSlug`, `event`, or `eventName` matches the event.
- Admin preview: `/partner-profile/?preview=4321` opens a sample company profile for visual review and page editing checks without loading live partner data.
- Routing support: `/partner-profile` redirects to `/partner-profile/`; no-cache headers are configured for `/partner-profile` and `/partner-profile/*`.

## Hidden Partner Registration

- Route: `/partner-registration/`
- Source file: `dist/partner-registration/index.html`
- API routes: `/api/partner-registration`, `/crm/api/public/partner-registration`, and `/crm/api/public/partner-invite-codes/[code]`
- Purpose: hidden event registration flow for partner contacts. The page should not appear in public navigation or public route lists; CRM-generated invite links are the attendee entry point. The private company hub may link to `/partner-registration/?preview=4321` for administrative page review.
- Storage model: CRM creates single-use codes under `crm:partner-invite-code:######`. Successful registrations are stored under `partner-registration:*` and `crm:partner-registrant:*`, with event metadata copied from the invite code.
- Admin preview: `/partner-registration/?preview=4321` opens the form for visual review and page editing checks, but the submit handler blocks registration in preview mode.
- Routing support: `/partner-registration` redirects to `/partner-registration/`; no-cache headers are configured for `/partner-registration` and `/partner-registration/*`.

## Executive Intelligence Membership

- Route: `/membership/`
- Source file: `dist/membership/index.html`
- Purpose: public Executive Intelligence Network membership page that positions membership as a curated, invite-only, year-round executive community and intelligence institution rather than event registration. The hero emphasizes that membership is not pay-to-play but contribute-to-connect: money cannot buy entry or continued standing, and membership is earned through contribution to the group, community, and industry. Existing members each have two invitations per month, are expected to make thoughtful invitations, and invitation activity is part of contribution tracking.
- Routing support: `/membership` redirects to `/membership/`; no-cache headers are configured for `/membership` and `/membership/*`.
- Interaction model: informational/invitation-led page only; no application form or request submission flow.
- Home page navigation: the former `Register` nav action now links to `/membership/`.

## Executive AI Intelligence Briefs

- Route: `/briefs/`
- Source file: `dist/briefs/index.html`
- Individual sample route: `/briefs/ai-innovation-at-operating-scale/`
- Individual sample source file: `dist/briefs/ai-innovation-at-operating-scale/index.html`
- PDF asset: `dist/assets/briefs/ai-innovation-at-operating-scale.pdf`
- Local review copy: `output/pdf/ai-innovation-at-operating-scale.pdf`
- Generator: `scripts/generate-ai-innovation-brief.py`
- Purpose: public archive doorway for Executive AI Intelligence Briefs and a dedicated sample route for the Mojo AI Summits Executive Research Council on AI Innovation brief titled `AI Innovation at Operating Scale`.
- Content model: full multipage HTML report with PDF download/open actions, opening council page, fictional executive contributors, six question-led council sections, citations, visual intelligence, sources reviewed, legal/privacy language, and sponsor back page.
- Footer linking: main public site footers link to `/briefs/`.

## Executive Fellowship Pathway

- Route: `/fellowships/`
- Source file: `dist/fellowships/index.html`
- Purpose: public fellowship pathway page that explains the four recognition levels from Fellow to Distinguished Fellow, contribution badges, private Executive Impact signals, annual impact profile concept, and member voting on tier advancement at quarterly summit events.
- Routing support: `/fellowships` redirects to `/fellowships/`; no-cache headers are configured for `/fellowships` and `/fellowships/*`.
- Membership page linking: `/membership/` links to `/fellowships/` from the page navigation, hero actions, and invitation closing section.

## Internal Event Playbook

- Route: `/events/`
- Source file: `dist/events/index.html`
- Origin: rebuilt from the downloaded `C:\Users\scott\Downloads\MoJo Event Playbook.html` concept into a maintainable generator/template page.
- Purpose: event profile generator plus reusable per-event playbook template for milestones, run of show, speakers, sponsors, registration, marketing, venue, production, budget, risk, and post-event capture.
- Generated page pattern: `/events/[event-name]-[date]/`
- Routing support: `/events` redirects to `/events/`; `/events/*` serves the playbook template; no-cache headers are configured for `/events` and `/events/*`.
- Storage model: deployed Pages Functions store generated playbooks in `MOJO_SUMMITS_SETUP_STATE`; local static previews fall back to browser `localStorage`.
- Event registrants: event detail API responses include matching CRM member, guest, and partner registrants whose `eventSlug`, `eventId`, `eventName`, or `eventDate` matches the event page. The page renders those records in an Event registrants section.
- Relationship to `/setup/`: `/setup/` remains the master operating checklist and ownership tracker; `/events/` is the event-specific execution/playbook artifact.
