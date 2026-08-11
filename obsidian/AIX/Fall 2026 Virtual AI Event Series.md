# 2026-2027 Virtual AI Event Series

Created: 2026-07-27

MOJO AI Summits is scaffolding twelve 2026-2027 virtual AI events as a lead-in to the 2027 in-person summit season.

## Dates

- Friday, September 4, 2026
- Friday, September 25, 2026
- Friday, October 16, 2026
- Friday, November 6, 2026
- Friday, November 27, 2026
- Friday, December 4, 2026
- Friday, December 18, 2026
- Friday, January 8, 2027

All sessions run from 1:00 PM to 2:30 PM Central.

## Working Arc

1. AI Executive Readiness
2. AI Use Cases That Survive Finance
3. AI Integration and Workflow
4. AI Security, Governance, and Trust
5. AI Operating Model for 2027
6. AI Budgeting and Investment Priorities
7. AI Workforce Readiness and Change Leadership
8. AI Executive Operating Agenda for 2027

## Implementation Notes

- Added public route: `/virtual/`
- Added dedicated event route: `/ai-executive-readiness-online/` for the September 4 AI Executive Readiness moderated roundtable.
- The 2026-2027 virtual series should live on its own `/virtual/` page, not as a full home-page section.
- The home page councils section should show separate virtual opportunity cards under the heading `Executive Research Councils`, above the state/city cards. Each virtual card links to its matching event page, shows its event date plus a second `Virtual` tag in the same style, and has a topic-specific cyan line icon. Do not collapse them into one virtual card in the state row.
- Home-page navigation should label this area as `Councils` and target `#councils`; do not show a separate top-nav `Virtual` link. Retain a hidden `#events` alias only for backward-compatible old links.
- Added internal `/setup/` checklist scaffold for virtual-event strategy, platform setup, speaker readiness, audience promotion, live delivery, and follow-up
- Added durable process note: `docs/processes/fall-2026-virtual-ai-event-series.md`

## Next Decisions

- Finalize series name, platform, speakers, sponsors, invite codes, and recording policy.
