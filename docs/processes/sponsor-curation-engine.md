# Sponsor Curation Engine

Date created: 2026-07-28

## Purpose

Mojo AI Summits needs a repeatable research and outreach engine for identifying AI-enabled companies that already sponsor, partner with, exhibit at, or otherwise fund business events. The goal is not to build a generic sponsor list. The goal is to find companies whose market posture, executive buyers, event behavior, and AI relevance make them credible Strategic Intelligence Partner prospects.

The engine should answer four questions:

- Which companies are plausibly AI-enabled and commercially active?
- Which companies show evidence of event sponsorship, event marketing, partner programs, field marketing, executive councils, or conference participation?
- Which contacts should Mojo reach: marketing leaders, field/event marketing, alliances/partnerships, demand generation, founder/CEO, CRO, CMO, and relevant AI or product executives?
- Which prospects are worth human outreach now, which should be nurtured, and which should be avoided because the fit would weaken executive trust?

## Operating Thesis

Sponsors buy attention. Mojo Strategic Intelligence Partners contribute to the intelligence layer.

That means the curation engine should prioritize:

- Companies selling into executives who care about AI adoption, workflow, security, governance, data, finance, operations, productivity, or transformation.
- Companies with proof they invest in live events, webinars, executive dinners, conferences, roadshows, partner ecosystems, or field marketing.
- Companies with leaders who can contribute useful perspective instead of sending only a booth-sales posture.
- Companies whose participation would improve the room for executive attendees.

## Prospect Universe

The initial universe should include these sponsor and vendor categories:

- AI infrastructure: cloud AI, model platforms, orchestration, data pipelines, vector search, model operations, observability, and evaluation.
- Enterprise software with AI features: ERP, CRM, HR, finance, service management, workflow automation, analytics, collaboration, productivity, and vertical SaaS.
- AI security, governance, compliance, privacy, risk, identity, legal tech, and trust platforms.
- Consulting, systems integration, managed services, digital transformation, implementation partners, and AI advisory firms.
- Hardware and edge AI: chips, devices, robotics, cameras, sensors, manufacturing technology, and industrial automation.
- Vertical AI vendors for healthcare, finance, insurance, energy, manufacturing, retail, construction, logistics, education, public sector, and professional services.
- Venture-backed AI startups with enterprise traction and active field marketing.
- Regional companies, agencies, and service providers that sell AI implementation to middle-market and executive audiences in target summit cities.

## Evidence Sources

The engine should store source evidence rather than relying on a single enrichment vendor. Good signals include:

- Event sponsor and exhibitor pages from AI, SaaS, cybersecurity, data, CIO, CFO, HR, operations, healthcare, manufacturing, and local business events.
- Conference agendas showing sponsored sessions, executive dinners, workshops, roundtables, lounges, breakfast briefings, or partner-led content.
- Company pages: events pages, webinar pages, partner pages, press releases, customer stories, product pages, and leadership pages.
- Job postings for event marketing, field marketing, demand generation, partner marketing, alliances, developer relations, evangelism, or community roles.
- News and funding announcements that indicate growth budget, AI positioning, strategic partnerships, or enterprise buyer focus.
- Sponsorship marketplaces, association sponsor pages, chamber/business council partner pages, and industry awards programs.
- CRM, inbox, LinkedIn, founder network, speaker nominations, member nominations, and referral data from the Mojo team.

Avoid treating AI keyword matches as enough. A company should only enter outreach when there is visible evidence for both AI relevance and event/partner-market behavior, or when a trusted referral supplies the missing signal.

## Core Data Model

Each company record should include:

- Company identity: name, domain, headquarters, regions served, company size, ownership stage, funding/public status, and category.
- AI relevance: AI product, AI-enabled service, AI implementation practice, AI governance/security/data posture, or credible AI buyer relevance.
- Event behavior: sponsored events, exhibitor listings, hosted webinars, executive dinners, roadshows, partner programs, conferences, associations, or field-marketing roles.
- Buyer fit: executive audience overlap, city/region relevance, industry relevance, budget authority, and likely event objectives.
- Trust fit: contribution posture, credible executive spokesperson, non-extractive sales behavior, and compatibility with Mojo's executive room design.
- Contacts: marketing, event marketing, partnerships, C-suite, revenue leadership, product/AI leadership, and warm introducers.
- Evidence: source URL, source title, evidence type, captured date, confidence, and short human-readable note.
- Outreach state: owner, stage, next action, next action date, last touch, channel, sequence, objections, proposal status, contract status, and renewal/nurture state.

## Scoring Model

Use a 100-point score for prioritization. Scores should be explainable and auditable.

- AI relevance, 20 points: direct AI product or credible AI-enabled service, enterprise buyer alignment, and timely AI market narrative.
- Event sponsorship behavior, 20 points: repeated sponsorships, exhibitor spend, field marketing team, webinars, dinners, or executive events.
- Executive audience fit, 20 points: sells to CEOs, CIOs, CISOs, CFOs, COOs, CHROs, founders, boards, or senior transformation leaders.
- Mojo model fit, 20 points: can contribute insight, case studies, leadership, or useful market intelligence without making the experience feel pay-to-play.
- Commercial readiness, 10 points: likely budget, active growth motion, regional interest, clear buyer segment, and timing.
- Contactability, 10 points: named contacts, warm paths, public emails, LinkedIn visibility, partner contacts, or existing relationship paths.

Recommended stages:

- `research_queue`: found but not reviewed.
- `researching`: analyst is gathering evidence.
- `qualified`: enough evidence for outreach.
- `priority`: high fit and high timing urgency.
- `outreach_ready`: contacts and message angle are approved.
- `contacted`: first outreach sent.
- `engaged`: reply, meeting, referral, or meaningful interaction.
- `discovery`: active fit conversation.
- `proposal`: package or partnership proposal sent.
- `committed`: verbal or signed commitment.
- `won`: agreement executed and handoff started.
- `nurture`: good company, wrong timing.
- `disqualified`: weak fit, bad behavior, no AI relevance, no budget, or trust risk.

## Research Workflow

1. Build the universe

   Create company candidates from event sponsor pages, exhibitor lists, AI vendor directories, conference agendas, association partner pages, CRM referrals, LinkedIn/network notes, and city-specific business ecosystems.

2. Deduplicate and normalize

   Normalize company names, domains, parent/subsidiary relationships, categories, location data, and source records. Keep local city vendors and regional subsidiaries when they may sponsor independently.

3. Collect evidence

   Capture at least one AI relevance source and one event behavior source before a company is marked `qualified`. Trusted referrals may override missing public evidence, but the override should be noted.

4. Score and explain

   Assign the six score components, calculate total score, and write a short "why this company" note. Any company over 75 should have a recommended outreach angle.

5. Contact map

   Identify a primary marketing contact, a senior executive, and any warm path. For larger companies, add field/event marketing and partnerships. For startups, add founder/CEO, CMO/head of marketing, and CRO/head of revenue.

6. Human review

   Before outreach, a Mojo owner confirms fit, trust risk, event relevance, category conflicts, and whether the company should be treated as sponsor, Strategic Intelligence Partner, speaker prospect, vendor, or nurture account.

7. Outreach and CRM handoff

   Approved prospects move to `outreach_ready`, get assigned to a team owner, and receive a specific message angle tied to the relevant event, council, executive audience, or strategic intelligence thesis.

## Outreach Rules

- Lead with fit, contribution, and executive intelligence value, not booth inventory.
- Avoid promising generic lead generation, attendee data access, stage time, or pay-to-play influence.
- Route large companies to field/event marketing, partner marketing, alliances, and C-suite executive sponsors.
- Route startups and founder-led companies to founders, CEOs, CMOs, heads of growth, and CROs.
- Route consulting and implementation firms to managing partners, market leaders, AI practice leads, alliances, and growth leaders.
- Do not send duplicate outreach from separate Mojo owners. One company should have one owner and one current next step.
- Keep opt-out, consent, privacy, and outreach limits clean. The engine should not automate high-volume cold email without review and suppression controls.

## Automation Architecture

The eventual system can be built as six services:

- Source collectors: crawl or import event sponsor pages, exhibitor directories, company event pages, job postings, CRM referrals, and manually uploaded spreadsheets.
- Entity resolver: normalize company identity, domains, categories, regions, duplicate records, and parent-child relationships.
- Evidence extractor: classify AI relevance, event behavior, executive buyer fit, sponsorship behavior, and contact clues from source text.
- Scoring engine: calculate explainable fit scores, confidence, reasons, and disqualifiers.
- Contact mapper: enrich contacts, infer roles, flag warm paths, and prepare approved contact bundles.
- Outreach queue: assign owners, generate recommended angles, track stages, and hand off to CRM or email tooling.

Automation should assist research, not bypass judgment. Human approval is required before first outreach, before proposal, and before accepting any partner into a sponsor or Strategic Intelligence Partner role.

## Marketing Team Pipeline

Daily operating view:

- New research candidates added.
- Companies qualified today.
- Priority companies awaiting owner review.
- Outreach-ready companies without first touch.
- Active conversations needing follow-up.
- Proposals sent and close probability.
- Nurture accounts with future event fit.
- Disqualified accounts and reasons.

Weekly review:

- Top 25 priority sponsor/partner targets.
- Source channels producing the best companies.
- Outreach response rates by message angle.
- Objections and market feedback.
- Category gaps by event topic.
- Conflicts, trust risks, and companies to avoid.

## Event Fit Mapping

For the fall 2026 virtual series, tag each prospect to one or more working topics:

- AI Executive Readiness
- AI Use Cases That Survive Finance
- AI Integration and Workflow
- AI Security, Governance, and Trust
- AI Operating Model for 2027

For city summits, add city/region fit, local market credibility, executive network overlap, and travel/sponsorship likelihood.

## MVP Build Plan

Phase 1: Manual engine

- Create a spreadsheet or CRM table with the data model above.
- Seed 200 to 500 companies from public sponsor pages and existing Mojo network referrals.
- Score each company manually using the 100-point rubric.
- Run weekly review with Jodi, Robert, Scott, and any assigned outreach owner.

Phase 2: Assisted research

- Add source import scripts for event sponsor pages and uploaded CSVs.
- Store source evidence with timestamps and evidence notes.
- Generate draft scores, contact roles, and outreach angles for human review.
- Export qualified prospects to CRM.

Phase 3: Outreach operations

- Add assignment, stage tracking, next-action reminders, suppression lists, and message-angle templates.
- Connect to the selected email/CRM tool only after approval rules are defined.
- Track reply, meeting, proposal, close, objection, and renewal signals.

Phase 4: Learning loop

- Compare score predictions to replies, meetings, closed sponsors, sponsor satisfaction, and event fit.
- Adjust weights by sponsor category, city, event topic, company size, and channel.
- Build a sponsor knowledge base so every outreach cycle improves the next one.

## First Implementation Decision

The next build decision is whether the MVP should live first as:

- A spreadsheet-backed operating tracker.
- A Cloudflare-native internal `/sponsors/` tool using the existing Mojo Auth and KV/D1 patterns.
- A connected external CRM workflow.

Recommended first step: start with a researched seed prospect file and a small scoring script, then promote to an internal `/sponsors/` tool once the team validates fields, stages, and scoring.

Starter files:

- Tracker template: `docs/processes/sponsor-curation-tracker-template.csv`
- Researched seed prospects: `docs/processes/sponsor-curation-seed-prospects.csv`
- Generated seed score report: `docs/processes/sponsor-curation-seed-score-report.generated.json`
- Scoring script: `scripts/score-sponsor-prospects.mjs`

Run the scorer against the researched seed file:

```powershell
node scripts/score-sponsor-prospects.mjs --in docs/processes/sponsor-curation-seed-prospects.csv --out docs/processes/sponsor-curation-seed-score-report.generated.json
```

The marketing team's job is not to build the universe manually. The research owner should keep expanding the seed file from public sponsor/exhibitor pages, conference agendas, company event pages, partner pages, job postings, CRM referrals, and Mojo network notes. The marketing team should review priority accounts, approve fit, assign owners, and run outreach.

The current seed file is researched from public sponsor and partner sources including The AI Summit London 2026, World Summit AI Amsterdam 2026, AI+ Expo 2026, and AI Infra Summit 2026. The generated report may mark a company as `priority` while still showing missing gates for named contacts or warm paths. That means the account is research-priority, not outreach-ready.
