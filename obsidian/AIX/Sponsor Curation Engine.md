# Sponsor Curation Engine

Created: 2026-07-28

Mojo AI Summits needs a sponsor curation engine to identify AI-enabled companies that already show event sponsorship, partner-marketing, field-marketing, or executive-event behavior.

## Core Thesis

This should not be a generic sponsor database. The engine should identify companies that can become Strategic Intelligence Partners: vendors and service providers whose participation improves executive decision quality, rather than companies simply buying attention.

## Operating Model

- Build a company universe from event sponsor pages, exhibitor directories, conference agendas, company event pages, webinar pages, job postings, press releases, partner pages, CRM referrals, and Mojo network notes.
- Require evidence for both AI relevance and event/partner-market behavior before a company is treated as qualified.
- Score prospects on AI relevance, event sponsorship behavior, executive audience fit, Mojo model fit, commercial readiness, and contactability.
- Map contacts across marketing, field/event marketing, partnerships, C-suite, revenue leadership, product/AI leadership, and warm introducers.
- Use human review gates before first outreach, before proposal, and before accepting any sponsor/partner commitment.

## Pipeline Stages

`research_queue`, `researching`, `qualified`, `priority`, `outreach_ready`, `contacted`, `engaged`, `discovery`, `proposal`, `committed`, `won`, `nurture`, `disqualified`.

## Durable Repo Artifacts

- `docs/processes/sponsor-curation-engine.md`
- `docs/processes/sponsor-curation-engine.generated.json`
- `docs/processes/sponsor-curation-tracker-template.csv`
- `docs/processes/sponsor-curation-seed-prospects.csv`
- `docs/processes/sponsor-curation-seed-score-report.generated.json`
- `scripts/score-sponsor-prospects.mjs`

## Recommended Next Step

Start from the researched seed prospects file, not a blank tracker. The research owner should expand the universe; the marketing team should review priority accounts, approve fit, assign owners, and run outreach. Promote to an internal `/sponsors/` tool after the team validates fields, stages, scoring, and review gates.
