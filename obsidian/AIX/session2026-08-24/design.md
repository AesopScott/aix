## 2026-08-24T08:40:22-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\07\27\rollout-2026-07-27T15-30-48-019fa57c-d29c-7640-966e-186ec74b43a9.jsonl
- Turn Id: 01a03433-050e-7961-a57e-fa9739b88018
- Classification: valuable
- Information Type: Design
- Reason: durable implementation outcome
- Trigger Prompt Hash: b0664c28dbfd12b2

### Prompt Memory

Automation: Daily Mojo AI Summits Receipt Review
Automation ID: daily-mojo-ai-summits-receipt-review
Automation memory: $CODEX_HOME/automations/daily-mojo-ai-summits-receipt-review/memory.md
Review Mojo AI Summits budget receipts for the /budget profit-and-loss workflow. Work in C:\Users\scott\Code\aix. Use the existing Cloudflare/R2 storage configuration and local credentials only as needed, without printing secrets. Confirm the /budget API ingests all receipts under receipts/ as costs, create the daily receipt review snapshot if possible, and summarize new receipts, receipts missing dollar amounts, reviewed/reimbursed totals, and any errors that need Scott's attention. Mandatory completion

[Prompt excerpt truncated by Obsidianify.]

### Assistant Outcome

Right now, yes, it will appear on every guest registration invite because it’s built into the shared `/guest/` registration page.

One caveat: the eight questions are currently hardcoded to the September 4 “AI Executive Readiness” questions. So functionally it works for every event, but content-wise every guest would rank that same set of eight questions.

The better version is to make it event-aware: pull the invite’s `eventSlug`, load that event’s question set, and fall back to a default set only if no event-specific questions exist. That way each virtual event can have its own ranked-choice survey.
## 2026-08-24T15:18:32-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\18\rollout-2026-08-18T09-17-43-01a01573-280c-7c02-9c13-5c52c6dd3f67.jsonl
- Turn Id: 01a0358d-8edd-7902-b1f6-8937f7bc6705
- Classification: valuable
- Information Type: Design
- Reason: durable prompt/outcome signal
- Trigger Prompt Hash: b0664c28dbfd12b2

### Prompt Memory

Automation: Daily Mojo AI Summits Receipt Review
Automation ID: daily-mojo-ai-summits-receipt-review
Automation memory: $CODEX_HOME/automations/daily-mojo-ai-summits-receipt-review/memory.md
Review Mojo AI Summits budget receipts for the /budget profit-and-loss workflow. Work in C:\Users\scott\Code\aix. Use the existing Cloudflare/R2 storage configuration and local credentials only as needed, without printing secrets. Confirm the /budget API ingests all receipts under receipts/ as costs, create the daily receipt review snapshot if possible, and summarize new receipts, receipts missing dollar amounts, reviewed/reimbursed totals, and any errors that need Scott's attention. Mandatory completion

[Prompt excerpt truncated by Obsidianify.]

### Assistant Outcome

Yes, we do have it now, but it is not a separate `/author-registration/` page.

It is an official `featured-author` registration role that uses the existing guest registration link flow:

- CRM invite creation includes `Featured Author`
- Guest matrix/add flow includes `Featured Author`
- It is labeled separately from `Featured Guest`
- It is treated like a featured/on-screen role for single show selection
- It triggers the featured bio/photo requirement
- Virtual event pages include `featured-author` alongside featured guests/partners

So the right way to think about it is: **Featured Author is now an official featured guest-style registration type, not just a generic guest, but it still registers through the guest registration page.**
