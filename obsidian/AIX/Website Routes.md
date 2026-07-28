# Website Routes

## Company Hub

- Route: `/admin/`
- Source file: `dist/admin/index.html`
- Purpose: company hub for Mojo AI Summits routes grouped by access level.
- Public space: `/`, `/dallas/`, `/virtual/`, `/membership/`, `/fellowships/`, `/partner/`, `/vip-registration/`, `/privacy/`, and `/sms-terms/`.
- Team space: `/setup/`, `/events/`, `/crm/`, and `/storage/`.
- Admin space: `/access/` and `/budget/`.
- Routing support: `/admin` redirects to `/admin/`; no-cache headers are configured for `/admin` and `/admin/*`.
- Access guidance: access control is disabled by default while accounts and page policies are being defined. When enabled in `/access/`, protect `/admin/`, `/crm/`, `/setup/`, `/events/`, `/storage/`, `/budget/`, and internal APIs `/api/crm`, `/api/setup-state`, `/api/events`, `/api/storage`, and `/api/budget` with Mojo Auth route modes. `/access/` is the public login/configuration shell; `/api/access-config`, `/api/access-users`, and `/api/access-invites` require an owner/admin Mojo Auth session for mutations, user management, and invite creation. `/api/auth/invite` stays public so invitees can accept single-use links and create separate Mojo passwords. Keep `/crm/api/public/...` public for invite-code lookup and guest registration callbacks.

## Strategic Intelligence Partners

- Route: `/partner/`
- Source file: `dist/partner/index.html`
- Purpose: public Strategic Intelligence Partner page that explains Mojo as an executive relationship and intelligence network for vendor leaders, not an event sponsorship seller.
- Routing support: `/partner` redirects to `/partner/`; no-cache headers are configured for `/partner` and `/partner/*`.

## Executive Intelligence Membership

- Route: `/membership/`
- Source file: `dist/membership/index.html`
- Purpose: public Executive Intelligence Network membership page that positions membership as a curated, year-round executive community and intelligence institution rather than event registration.
- Routing support: `/membership` redirects to `/membership/`; no-cache headers are configured for `/membership` and `/membership/*`.
- Interaction model: informational/invitation-led page only; no application form or request submission flow.
- Home page navigation: the former `Register` nav action now links to `/membership/`.

## Executive Fellowship Pathway

- Route: `/fellowships/`
- Source file: `dist/fellowships/index.html`
- Purpose: public fellowship pathway page that explains the five recognition levels, contribution badges, private Executive Impact signals, annual impact profile concept, and member voting on tier advancement at quarterly summit events.
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
