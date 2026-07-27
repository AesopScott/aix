# Website Routes

## Internal Admin Links

- Route: `/admin/`
- Source file: `dist/admin/index.html`
- Purpose: private index of Mojo AI Summits company routes that should not be exposed in the public site navigation.
- Included internal routes: `/crm/`, `/setup/`, `/events/`, `/storage/`, `/budget/`, `/mockups/`, and individual `/mockups/mockup*/` pages.
- Included controlled-share route: `/vip-registration/`, for invite-code previews and direct guest invite links.
- Routing support: `/admin` redirects to `/admin/`; no-cache headers are configured for `/admin` and `/admin/*`.
- Access guidance: protect `/admin/*`, `/crm/*`, `/setup/*`, `/events/*`, `/storage/*`, `/budget/*`, and `/mockups/*` with Cloudflare Access before sharing broadly.

## Internal Event Playbook

- Route: `/events/`
- Source file: `dist/events/index.html`
- Origin: rebuilt from the downloaded `C:\Users\scott\Downloads\MoJo Event Playbook.html` concept into a maintainable generator/template page.
- Purpose: event profile generator plus reusable per-event playbook template for milestones, run of show, speakers, sponsors, registration, marketing, venue, production, budget, risk, and post-event capture.
- Generated page pattern: `/events/[event-name]-[date]/`
- Routing support: `/events` redirects to `/events/`; `/events/*` serves the playbook template; no-cache headers are configured for `/events` and `/events/*`.
- Storage model: deployed Pages Functions store generated playbooks in `MOJO_SUMMITS_SETUP_STATE`; local static previews fall back to browser `localStorage`.
- Relationship to `/setup/`: `/setup/` remains the master operating checklist and ownership tracker; `/events/` is the event-specific execution/playbook artifact.
