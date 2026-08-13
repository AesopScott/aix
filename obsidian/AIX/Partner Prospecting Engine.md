# Partner Prospecting Engine

Updated: 2026-08-13

## Summary

The Mojo CRM now has a Phase A Partner Prospecting foundation for LinkedIn-first AI partner outreach.

## Architecture

- Internal prospecting companies are stored under `crm:partner-prospect-company:*`.
- Internal prospecting people are stored under `crm:partner-prospect-person:*`.
- Score and outreach audit events are stored under `crm:partner-prospect-audit:*`.
- Prospecting data stays internal to `/api/crm?prospecting=1`.
- Partner-facing profile data is not populated until an internal user converts a prospect.

## Workflow

The CRM Partner Prospecting area includes Vendor Universe, Partner Targets, Research Queue, People, Outreach Queue, Partner Pipeline, Discovery Queue, Dashboard, and Walkthroughs views.

Miller's queue is LinkedIn-first. The CRM provides platform links, prepared search text, and manual action controls only. It does not scrape, send connection requests, or send messages.

## Discovery

The Discovery Queue can now run a public-source discovery pass from a supplied URL, such as a conference sponsor page, public portfolio page, marketplace list, or AI directory page.

The Discovery Queue now includes built-in starter sources so operators do not need to bring source URLs before Vendor Universe can start. The starter library includes conference sponsor lists/prospectuses and AI company directories, and exposes one-click `Run Source` and `Run Starter Sources` actions.

The discovery pass fetches the HTML, extracts outbound company domains, filters common non-company/social/search domains, dedupes by canonical domain, and creates Vendor Universe records with source provenance.

Each discovered company can then run website analysis. The first implementation uses transparent keyword/category signals to classify AI relevance, enterprise focus, likely category, target executive roles, partner score, and queue status. It is intentionally replaceable by a model-backed classifier later.

Discovery sources are now persisted under `crm:partner-prospect-source:*` with source type, URL, run status, run error, last run time, and discovered count.

The Discovery Queue also supports pasted CSV/company-list imports. Supported columns include `companyName`, `canonicalDomain`, `websiteUrl`, `linkedinCompanyUrl`, `primaryCategory`, `categories`, `sourceUrls`, `description`, and `classificationReason`.

Batch website analysis can process the next unanalyzed companies so Miller does not need to click each discovered record one at a time.

Operators can rerun an individual saved source or run all active saved sources from the Discovery Queue. The payload includes queue counters for active sources, source failures, discovered companies, companies needing analysis, failed company records, ready-for-outreach companies, and needs-review companies.

## Review And Scoring

Vendor Universe and Partner Target cards now include human review controls for marking a company as an AI vendor, marking it as not an AI vendor, marking it human verified, sending it back to needs review, overriding the primary category, and overriding the partner score.

Scoring weights are stored under `crm:partner-prospect-score-config`. The dashboard exposes the active weights, and saving them recalculates all prospect company scores while preserving explicit score overrides.

Review actions write review metadata on the prospect company record: `reviewStatus`, `reviewedAt`, `reviewedBy`, `humanVerifiedAt`, and `humanVerifiedBy` where applicable. Score overrides append to the company `scoreAudit`.

## Source Quality

Source performance now tracks more than discovered counts. The dashboard reports companies, qualified AI vendors, ready-for-outreach companies, contacted companies, responses, meetings, partners, and average partner score by discovery source.

Discovery Source cards also surface qualified count, ready count, response count, and average score so operators can compare source quality where sources are managed.

## Phase C Research Queue

Phase C begins with manual people-search support, not platform integration.

The CRM now has a Research Queue for qualified companies. It generates copyable people-search text and outbound search links so the marketing team can find relevant people manually, then record what happened back in the CRM.

Each prospect company can store:

- `peopleSearchStatus`
- `peopleSearchRoles`
- `peopleSearchQuery`
- `peopleSearchNotes`
- `peopleSearchPreparedAt`
- `peopleSearchPreparedBy`
- `peopleSearchCompletedAt`
- `peopleSearchCompletedBy`
- `manualLeadListName`
- `manualLeadListUrl`
- `manualLeadListOwner`
- `manualLeadListUpdatedAt`

The Research Queue and Dashboard track companies needing people search, prepared searches, and manual lead lists built.

Person work is expected to happen in Sales Navigator and manual lead lists. The CRM stores the resulting person records and research state, but Phase C does not try to replace the team's people-search workflow.

## Conference Sponsor Playbook

Conference sponsor evidence is a high-value company interest signal. The Discovery Queue now includes a Conference Sponsor Playbook with manual search launchers for sponsor pages, exhibitor lists, sponsorship prospectuses, pricing clues, and sponsor-company searches.

`Conference Sponsorship Prospectus` is now available as a discovery source type.

Each prospect company can store:

- `sponsoredEvents`
- `sponsorEvidenceUrls`
- `sponsorshipFit`
- `sponsorshipEstimatedSpend`
- `sponsorshipThemes`
- `sponsorshipNotes`
- `sponsorEvidenceUpdatedAt`
- `sponsorEvidenceUpdatedBy`

Sponsor evidence is intentionally CRM-style notes and evidence. Spend should be treated as a clue from public sponsor tiers, prospectus pages, booth packages, or visible sponsorship level, not as verified financial data unless a source explicitly states the amount.

## Walkthroughs

The Partner Prospecting navigation now includes a bottom Walkthroughs button. The view provides operating walkthroughs for Vendor Universe buildout, review/scoring, sponsor evidence, hiring signals, people research, people records, manual outreach tracking, Partner Candidate conversion, and dashboard health. The Vendor Universe walkthrough starts with `Run Starter Sources` as the first action.

## Hiring Signal Sources

Hiring platforms can be useful for discovering AI-active companies because job postings often reveal active AI, machine learning, data, governance, security, and platform investments.

The Discovery Queue now includes a Hiring Signals panel with manual search launchers for Indeed, Dice, Monster, and a web-search fallback. The CRM does not ingest job-board data directly. Operators use the searches to identify company names, then add selected companies through manual entry, CSV import, or a saved public source URL.

`Hiring Platform / Job Board` is now available as a discovery source type.

## Conversion

Qualified companies can be converted to the existing partner model as `Partner Candidate`. Conversion writes a minimal `partner-company:*` record with safe company/contact basics and does not expose prospecting scores, rationale, queue state, or internal intelligence to partner-facing APIs.

## Verification

Verified with:

- CRM API syntax check.
- Inline CRM script syntax check.
- In-memory API workflow for company creation, person creation, outreach timestamp, and Partner Candidate conversion.
- In-memory discovery workflow for source URL extraction and website analysis.
- In-memory Phase B workflow for public source discovery, CSV import, source persistence, and batch website analysis.
- In-memory run-all source workflow for saved discovery sources and queue count updates.
- In-memory review/scoring workflow for human review actions, category override, score override, scoring config persistence, score recalculation, and source quality rollups.
- In-memory Phase C workflow for people-search mission state, manual lead-list details, role persistence, and queue/dashboard counters.
- In-memory sponsor evidence workflow for sponsored events, evidence URLs, sponsor fit, spend clues, themes, notes, and dashboard counter.
- In-memory starter-source workflow for built-in source payload, one-click starter source run, and discovered company creation.
- Local Wrangler Pages server on `http://127.0.0.1:8788`.
- Local `GET /api/crm?prospecting=1` check with `scoreConfig` and `sourcePerformance` present.
- Local `GET /crm/` check with Research Queue controls present.
- Local `GET /crm/` check with Hiring Signals and `Hiring Platform / Job Board` source type present.
- Local `GET /crm/` check with Conference Sponsor Playbook, sponsor evidence forms, and `Conference Sponsorship Prospectus` source type present.
- Local `GET /crm/` check with Walkthroughs button and walkthrough content present.
- Local `GET /api/crm?prospecting=1` check with built-in `starterSources` present.
