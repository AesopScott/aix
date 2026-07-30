# Website Routes

## Company Hub

- Route: `/admin/`
- Source file: `dist/admin/index.html`
- Purpose: company hub for Mojo AI Summits routes grouped by access level.
- Public space: `/`, `/dallas/`, `/virtual/`, `/membership/`, `/fellowships/`, `/partners/`, `/member-registration/`, `/member-profile/`, `/guest/`, `/privacy/`, and `/sms-terms/`.
- Hidden invite-only space: `/partner-registration/` exists only for CRM-generated partner invite links and should not be added to public navigation or site route listings.
- Partner space: `/partner-profile/` for approved partner contacts.
- Team space: `/setup/`, `/events/`, `/crm/`, and `/files/` for the Storage portal. `/storage/` remains the legacy Storage path.
- Admin space: `/access/` and `/budget/`.
- Routing support: `/admin` redirects to `/admin/`; no-cache headers are configured for `/admin` and `/admin/*`.
- Guest registration compatibility: legacy `/vip-registration/?invite=######` CRM links redirect to `/guest/?invite=######` so existing invite links continue to work while the public language uses guest registration.
- Registration access: `/member-registration/` is public to load but hides the registration form behind a six-digit member invite code. The home page modal, `?invite=######`, session storage, or direct code entry can unlock it after `/crm/api/public/member-invite-codes/######` validation. The member profile generator writes single-use nomination codes under `crm:member-invite-code:######`; `MOJO_MEMBER_INVITE_CODES_STRICT=true` makes stored active codes mandatory. `/member-profile/?preview=4321` opens the administrative sample member profile with non-submitting forms. `/partner-registration/` is stricter: it unlocks only from a CRM-generated `?invite=######` link backed by a stored `crm:partner-invite-code:######` record. `/partner-registration/?preview=4321` is the administrative non-submitting preview link.
- Registration data model: member and guest registration collect name, company, title, industry, company email, phone, role selections, food preferences, phone verification status, and separate publication-use opt-ins for name and company. Title and industry do not have publication opt-ins.
- Access guidance: access control is disabled by default while accounts and page policies are being defined. When enabled in `/access/`, protect `/admin/`, `/crm/`, `/partner-profile/`, `/setup/`, `/events/`, `/storage/`, `/budget/`, and internal APIs `/api/crm`, `/api/partner-profile`, `/api/setup-state`, `/api/events`, `/api/storage`, and `/api/budget` with Mojo Auth route modes. `/member-profile/` and `/api/member-profile` remain public at the route-control layer so members see the member login page, but `/api/member-profile` requires an accepted Mojo Auth member session before returning directory or invite data. `/files/` is the site-managed Storage portal shell and stays reachable so users can get to site sign-in; file data and operations remain protected by `/api/storage`. `/storage/` may still be intercepted by external Cloudflare Access until that rule is removed. `/access/` is the public login/configuration shell; `/api/access-config`, `/api/access-users`, and `/api/access-invites` require an owner/admin Mojo Auth session for mutations, user management, and invite creation. `/api/auth/invite` stays public so invitees can accept single-use links and create separate Mojo passwords. Keep `/crm/api/public/...` public for invite-code lookup and guest registration callbacks.

## Member Profile

- Route: `/member-profile/`
- Source file: `dist/member-profile/index.html`
- API route: `/api/member-profile`
- Purpose: private accepted-member dashboard showing tier, system-trackable fellowship progress, nomination consent, fellowship promotion nominations, member voting, guest show invite generation, new-member nomination generation, accepted member directory, Discord/member-channel contacts, Mojo staff contacts, and tier contribution guidance.
- Admin preview: `/member-profile/?preview=4321` opens a sample profile for visual review and page editing checks; invite, nomination, preference, and voting forms do not submit in preview mode.
- CRM workflow: from `/crm/`, staff can mark a member registrant accepted, generate or reset the member password, and manually provide that password to the member. The password is stored on the CRM member record for handoff and is also installed into Mojo Auth for `/member-profile/` login.
- Storage model: accepted member records are read from `crm:member-registrant:*` with `member-registration:*` fallback. Guest invite links are stored as `crm:guest-invite-code:######` and open `/guest/?invite=######`. New-member nomination links are stored as `crm:member-invite-code:######` and open `/member-registration/?invite=######`. Fellowship promotion nominations are stored as `crm:fellowship-nomination:*`.
- Nomination policy: new-member nomination links remain limited to two per accepted member per month. Fellowship promotion eligibility is computed by the profile API from trackable fields only: profile completeness, good-standing status, sessions attended, summits attended, documented contributions, peer promotion nominations, and votes. There is no minimum time requirement and no human eligibility verification step. Members opt in with `openToFellowshipNomination`; only another current accepted member can nominate them, self-nomination is blocked, and the API opens nominations 30 days before quarterly summits using `MOJO_FELLOWSHIP_SUMMIT_DATES` or quarter-end fallback dates. Distinguished Fellow nominations require extra review evidence fields for member evaluation. Approval thresholds are majority for Contributing Fellow, two-thirds for Senior Fellow, and three-fourths for Distinguished Fellow.

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
- Purpose: hidden event registration flow for partner contacts. The page should not appear in public navigation, the company hub, or public route lists; CRM-generated invite links are the entry point.
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
- Relationship to `/setup/`: `/setup/` remains the master operating checklist and ownership tracker; `/events/` is the event-specific execution/playbook artifact.
