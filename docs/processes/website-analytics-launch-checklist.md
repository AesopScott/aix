# Website Analytics Activation and Launch Checklist

Updated: 2026-08-13

Use this checklist whenever MOJO AI Summits launches a public campaign, event page, registration funnel, sponsor page, booking path, or analytics/tracking change.

Source standard: `docs/processes/website-analytics-privacy-conversion-standards.md`

Visible operating page: `/analytics/`

## What the Standard Does

The standard becomes actionable in four places:

- Public notice: `/privacy/` tells visitors what analytics and conversion measurement exist.
- Developer rule: `AGENTS.md` tells future Codex sessions and repo contributors what is allowed before adding trackers.
- Launch gate: `scripts/check-website-analytics-privacy.mjs` scans the site for prohibited tracking snippets and missing required notice language.
- Operating tracker: `/setup/` records the foundation item as complete while leaving per-event analytics confirmation open for each launch.
- Admin tracker: `/admin/` links to `/analytics/` so the workflow remains visible alongside other company routes.

## Activation Steps

1. Confirm analytics source.
   - Owner: Jodi.
   - Acceptance: Cloudflare Pages Analytics or Cloudflare Web Analytics is the active baseline, or an approved alternative is documented.

2. Confirm Cloudflare reporting access.
   - Owner: Scott.
   - Support: Jodi.
   - Acceptance: Jodi can view aggregate page, referrer, geography, device/browser, and performance reports without needing secret values in chat or docs.

3. Create the campaign UTM plan.
   - Owner: Jodi.
   - Acceptance: every launch link has `utm_source`, `utm_medium`, and `utm_campaign`; optional `utm_content` identifies creative or segment. No personal information appears in UTM values.

4. Map conversion outcomes.
   - Owner: Jodi.
   - Support: Scott.
   - Acceptance: each page/funnel has named outcomes using the event names in the standard, and high-value conversions reconcile to first-party CRM, invite, booking, or registration records. Member, guest, partner, and partner subscription submissions should preserve sanitized `campaignAttribution` when campaign UTMs are present.

5. Review privacy notice.
   - Owner: Robert.
   - Support: Jodi.
   - Acceptance: `/privacy/` still accurately describes analytics, cookies, conversion measurement, vendors, SMS handling, and sponsor-sharing boundaries.

6. Check for consent requirement.
   - Owner: Robert.
   - Support: Scott.
   - Acceptance: no non-essential tracker is present, or a consent mechanism blocks it before load and records the required review evidence.

7. Run the launch gate.
   - Owner: Scott.
   - Command: `node scripts/check-website-analytics-privacy.mjs`
   - Acceptance: command exits successfully, or a named owner accepts and documents the exception.

8. Capture launch evidence.
   - Owner: Jodi.
   - Acceptance: campaign source plan, analytics source, privacy review date, and conversion outcomes are linked from the event or campaign operating notes.

## Done Means

The analytics standard is not "done" because a document exists. It is done for a launch only when:

- The public notice is accurate.
- The implementation has no unapproved trackers.
- The campaign links are tagged.
- The conversion outcomes are named.
- First-party records preserve allowed source attribution.
- The launch gate passes.
- Owners know where to look for reporting.
