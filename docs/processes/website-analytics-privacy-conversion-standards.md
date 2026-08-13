# Website Analytics, Privacy Notice, Consent, and Conversion Standards

Updated: 2026-08-13

## Purpose

This standard governs analytics, website privacy notices, cookie and consent decisions, and conversion tracking for `mojoaisummits.com`.

It is an operating standard, not legal advice. Robert owns final legal review. Jodi owns marketing and website execution. Scott supports implementation.

## Current Decision

MOJO AI Summits should use privacy-first, low-data analytics as the default website measurement posture.

Approved baseline:

- Cloudflare Pages platform analytics and/or Cloudflare Web Analytics for aggregate page, referral, browser, geography, and performance reporting.
- First-party operational conversion records created by Mojo registration, invite, booking, CRM, and event APIs.
- UTM parameters on public campaign links, with no personal information in URL parameters.

Not approved without a new review:

- Google Analytics, Google Tag Manager, Google Ads tags, Floodlight, Meta Pixel, LinkedIn Insight Tag, TikTok Pixel, Microsoft Ads UET, Clearbit/Reveal, session replay, heatmaps, fingerprinting, cross-site retargeting, or enrichment tags.
- Any tracker that sets or reads non-essential cookies, local storage, device identifiers, fingerprinting signals, ad click identifiers, or cross-site advertising identifiers.
- Any event payload that includes raw phone numbers, email addresses, invite codes, SMS verification codes, access tokens, passwords, or sensitive private notes.

## Consent Requirement

No public cookie banner is required for the approved baseline if implementation stays limited to:

- Strictly necessary Mojo Auth/session cookies.
- Strictly necessary security, routing, and platform cookies set by Cloudflare or the hosting layer.
- Cloudflare Web Analytics or equivalent analytics that does not collect personal visitor data, does not set cookies, and does not support cross-site advertising or retargeting.
- First-party registration and CRM records submitted intentionally by users.

A cookie or consent mechanism is required before enabling any non-essential storage, access, or tracking technology. This includes analytics cookies, advertising pixels, remarketing tags, conversion linker cookies, device fingerprinting, local storage identifiers, session replay, or third-party marketing scripts.

Minimum consent mechanism standard:

- Block non-essential scripts until consent is recorded.
- Provide equally clear choices to accept, reject, and customize non-essential purposes.
- Separate at least these purposes: analytics, advertising, personalization, and functional preferences.
- Store consent choices only as long as needed to honor the choice.
- Allow users to change or withdraw consent from the privacy page or footer.
- Keep a record of the consent text, purposes, vendors, implementation date, and test evidence.
- Honor Global Privacy Control for any sale, sharing, targeted advertising, or cross-context behavioral advertising use case.

If Google tags are approved later, implement Google Consent Mode v2 before any Google measurement command fires. Default `ad_storage`, `ad_user_data`, `ad_personalization`, and `analytics_storage` to `denied` in consent-required regions, then update only after the user acts.

## Privacy Notice Standard

The public privacy policy must disclose:

- Categories of information collected through forms, registration, SMS verification, account access, and website analytics.
- Purposes for collection, including registration review, event logistics, security, support, operational reporting, and conversion measurement.
- Whether analytics is aggregate/cookieless or uses personal data, cookies, ad identifiers, or third-party advertising platforms.
- Service provider categories, including hosting, storage, messaging, email, CRM, analytics, event operations, and payment tools when applicable.
- SMS terms linkage and opt-out handling.
- Sponsor and partner data-sharing boundaries.
- Contact channel for privacy requests.
- Last updated date.

Privacy notice updates are required before deploying:

- A new analytics or advertising vendor.
- A new public form collecting materially different personal information.
- New sponsor data-sharing rights.
- New event recording, photography, transcript, attendee-list, or publication-use practices.
- New payment, ticketing, email marketing, or calendar integration that changes data handling.

## Conversion Event Standards

Conversion tracking should measure business outcomes without creating unnecessary personal-data exposure.

### Event Naming

Use lowercase snake_case event names:

- `page_view`
- `registration_start`
- `invite_code_valid`
- `invite_code_invalid`
- `phone_verification_start`
- `phone_verification_success`
- `registration_submit_success`
- `registration_submit_error`
- `partner_interest_submit_success`
- `booking_start`
- `booking_submit_success`
- `member_profile_login_success`
- `sponsor_pricing_view`
- `outbound_email_click`
- `event_calendar_add`

### Event Properties

Allowed properties:

- `route`
- `page_type`
- `event_slug`
- `registration_type`
- `invite_type`
- `source`
- `medium`
- `campaign`
- `content`
- `term`
- `partner_tier`
- `member_tier`
- `status`
- `error_code`
- `timestamp`

Prohibited properties:

- Email address.
- Phone number.
- Name.
- Company contact notes.
- Full invite code.
- SMS verification code.
- Access token.
- Password or temporary password.
- Free-text fields unless reviewed for privacy risk.

Use stable internal IDs only when needed for operational reporting. Prefer server-side CRM records for high-value conversions rather than browser-side ad pixels.

Current implementation: member, guest, partner registration, and partner subscription request submissions capture allowed UTM/source fields and store sanitized `campaignAttribution` data with first-party registration/contact records.

## UTM Standards

Use these URL parameters for campaign links:

- `utm_source`: sending platform or list owner, such as `linkedin`, `newsletter`, `direct_outreach`, `partner`, `eventbrite`, or `meetup`.
- `utm_medium`: channel type, such as `social`, `email`, `direct`, `partner`, `paid_social`, or `event_listing`.
- `utm_campaign`: campaign or event slug, such as `dallas_2027_launch` or `ai_security_governance_2026_10_16`.
- `utm_content`: creative, segment, or CTA variant.
- `utm_term`: paid keyword only.

Do not place names, email addresses, phone numbers, invite codes, company-specific private notes, or hidden audience segments in UTM values.

## Reporting Standards

Primary reporting views:

- Acquisition: source, medium, campaign, landing page, and route group.
- Registration funnel: landing page view, registration start, invite validation, phone verification, submission success, CRM acceptance.
- Partner funnel: partner page view, pricing view, information request, invite issued, partner registration submitted, partner accepted.
- Event funnel: event page view, calendar add, registration, qualified attendee, live attendance, follow-up meeting, Member nomination, sponsor lead.
- Quality: conversion rate by campaign, qualified attendee rate, sponsor-fit rate, and follow-up meeting rate.

Report only aggregate counts and rates in public, sponsor-facing, or non-operational materials unless the attendee has explicitly agreed to the named use.

## Implementation Checklist

- Confirm analytics source is Cloudflare-only or another approved low-data analytics tool.
- Update `/privacy/` whenever analytics, cookies, tracking, vendors, or conversion practices materially change.
- Keep non-essential trackers out of public HTML unless a consent mechanism and review record exist.
- Confirm that forms and APIs never send prohibited event properties to analytics tools.
- Add campaign UTMs to all public launch, virtual event, partner, and sponsor links.
- Review cookies, local storage, third-party scripts, privacy notice language, and conversion payloads before each major campaign launch.
- Run `node scripts/check-website-analytics-privacy.mjs` before public launches and treat failures as launch blockers unless a named owner accepts the exception.

## How This Becomes Actionable

This standard is activated through:

- `AGENTS.md`, which makes the standard mandatory context for future analytics, consent, tracking, and campaign-attribution changes.
- `docs/processes/website-analytics-launch-checklist.md`, which assigns the launch workflow to Jodi, Robert, and Scott.
- `scripts/check-website-analytics-privacy.mjs`, which scans public HTML for prohibited tracking snippets and confirms the privacy notice contains the required analytics and conversion language.
- `/setup/`, which marks the one-time foundation standard complete while keeping per-launch analytics confirmation open.
- Public registration/request forms, which pass sanitized UTM/source fields into first-party operational records instead of third-party browser pixels.

## Reference Sources

- Cloudflare Web Analytics docs state that Web Analytics uses a JavaScript beacon for page views and visitor metrics and does not collect or use visitors' personal data.
- ICO cookie guidance says sites must tell users about cookies, explain what they do and why, and obtain consent unless an exemption applies.
- California DOJ guidance says covered businesses must honor Global Privacy Control as a valid opt-out request for sale or sharing of personal information.
- Google Consent Mode documentation says implementations must set default consent state and update it based on user interaction, with Consent Mode v2 parameters for ads user data and personalization.
