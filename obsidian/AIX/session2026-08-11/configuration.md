## 2026-08-11T11:12:19-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\07\27\rollout-2026-07-27T15-34-36-019fa580-4c55-7fa0-addc-d1a2d6dacd66.jsonl
- Turn Id: 019fed56-1a3d-7ea2-8c61-ad7ed83f78be
- Classification: valuable
- Information Type: Configuration
- Reason: durable implementation outcome
- Trigger Prompt Hash: b0664c28dbfd12b2

### Prompt Memory

Automation: Daily Mojo AI Summits Receipt Review
Automation ID: daily-mojo-ai-summits-receipt-review
Automation memory: $CODEX_HOME/automations/daily-mojo-ai-summits-receipt-review/memory.md
Review Mojo AI Summits budget receipts for the /budget profit-and-loss workflow. Work in C:\Users\scott\Code\aix. Use the existing Cloudflare/R2 storage configuration and local credentials only as needed, without printing secrets. Confirm the /budget API ingests all receipts under receipts/ as costs, create the daily receipt review snapshot if possible, and summarize new receipts, receipts missing dollar amounts, reviewed/reimbursed totals, and any errors that need Scott's attention. Mandatory completion

[Prompt excerpt truncated by Obsidianify.]

### Assistant Outcome

Deployed.

PR [#48](https://github.com/AesopScott/aix/pull/48) is merged to `main`, product version is now `0.1.43`, and Cloudflare Pages completed successfully.

Live deployment: [https://f74461da.mojo-ai-summits.pages.dev](https://f74461da.mojo-ai-summits.pages.dev)

Included:
- Setup tracker **Quick Add** inbox for placeholder tasks.
- Shared persistence for quick-added setup items.
- Setup calendar support for quick-added dated items.
- Calendar chips: `Delivered` = green, overdue = red.

Timing:
- Scope and integration context: 0:13
- Clean branch and implementation: 4:35
- Validation: 0:28
- Commit and push: 0:11
- PR and merge: 0:33
- Production deployment verification: 0:42
- Total: 6:42

Workflow step note: `Deploy to Cloudflare Pages` completed in about 24s; no step exceeded 2 minutes.

::git-create-branch{cwd="C:\Users\scott\Code\aix-deploy-setup-quick-add-calendar" branch="codex/setup-quick-add-calendar-states"}
::git-stage{cwd="C:\Users\scott\Code\aix-deploy-setup-quick-add-calendar"}
::git-commit{cwd="C:\Users\scott\Code\aix-deploy-setup-quick-add-calendar"}
::git-push{cwd="C:\Users\scott\Code\aix-deploy-setup-quick-add-calendar" branch="codex/setup-quick-add-calendar-states"}
::git-create-pr{cwd="C:\Users\scott\Code\aix-deploy-setup-quick-add-calendar" branch="codex/setup-quick-add-calendar-states" url="https://github.com/AesopScott/aix/pull/48" isDraft=false}
## 2026-08-11T11:29:57-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\07\23\rollout-2026-07-23T09-49-29-019f8faa-e6db-7cb2-adae-75aea902a609.jsonl
- Turn Id: 019fb006-d90f-74f1-a660-258633567d48
- Classification: valuable
- Information Type: Configuration
- Reason: durable prompt/outcome signal
- Trigger Prompt Hash: b0664c28dbfd12b2

### Prompt Memory

Automation: Daily Mojo AI Summits Receipt Review
Automation ID: daily-mojo-ai-summits-receipt-review
Automation memory: $CODEX_HOME/automations/daily-mojo-ai-summits-receipt-review/memory.md
Review Mojo AI Summits budget receipts for the /budget profit-and-loss workflow. Work in C:\Users\scott\Code\aix. Use the existing Cloudflare/R2 storage configuration and local credentials only as needed, without printing secrets. Confirm the /budget API ingests all receipts under receipts/ as costs, create the daily receipt review snapshot if possible, and summarize new receipts, receipts missing dollar amounts, reviewed/reimbursed totals, and any errors that need Scott's attention. Mandatory completion

[Prompt excerpt truncated by Obsidianify.]

### Assistant Outcome

Everything is already deployed.

The repo is clean, local `main` matches `origin/main`, and the latest Cloudflare Pages run succeeded for:

`136ed63 Update membership access principle copy`
## 2026-08-11T12:01:27-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\07\27\rollout-2026-07-27T15-34-36-019fa580-4c55-7fa0-addc-d1a2d6dacd66.jsonl
- Turn Id: 019ff1f9-f326-7192-ba24-13c716bbf0c3
- Classification: valuable
- Information Type: Configuration
- Reason: durable implementation outcome
- Trigger Prompt Hash: b0664c28dbfd12b2

### Prompt Memory

Automation: Daily Mojo AI Summits Receipt Review
Automation ID: daily-mojo-ai-summits-receipt-review
Automation memory: $CODEX_HOME/automations/daily-mojo-ai-summits-receipt-review/memory.md
Review Mojo AI Summits budget receipts for the /budget profit-and-loss workflow. Work in C:\Users\scott\Code\aix. Use the existing Cloudflare/R2 storage configuration and local credentials only as needed, without printing secrets. Confirm the /budget API ingests all receipts under receipts/ as costs, create the daily receipt review snapshot if possible, and summarize new receipts, receipts missing dollar amounts, reviewed/reimbursed totals, and any errors that need Scott's attention. Mandatory completion

[Prompt excerpt truncated by Obsidianify.]

### Assistant Outcome

Deployed.

PR #83 was merged into `main`: [Deploy setup calendar polish](https://github.com/AesopScott/aix/pull/83)
Cloudflare Pages deploy succeeded: [https://2cc11aa6.mojo-ai-summits.pages.dev](https://2cc11aa6.mojo-ai-summits.pages.dev)

Shipped:
- Setup page `No due date` filter
- Priority options: `Immediate`, `High`, `Medium`, `Low`
- Calendar color legend for Complete and Overdue
- Calendar owner filter now filters by owner only
- Product version `0.1.62`
- Setup checklist version `3.15`

Verification:
- Setup and calendar inline scripts parse
- PR contained only `VERSION`, `dist/setup/index.html`, and `dist/setup/calendar/index.html`
- GitHub Actions run `31520387548` completed successfully
- `Deploy to Cloudflare Pages` step completed under 2 minutes

Timing:
- Phase 1, scope and deploy workflow checks: ~25s
- Phase 2, commit/version/source validation: ~1m 20s
- Phase 3, PR merge handling: ~50s
- Phase 4, workflow monitoring: ~1m 10s
- Phase 5, deployment URL and final verification: ~25s
- Total: ~4m 10s
## 2026-08-11T19:09:49-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\11\rollout-2026-08-11T19-07-56-019ff382-fe5f-7863-a75f-6961f2420f2a.jsonl
- Turn Id: 019ff384-38e2-7dc2-8af3-334f5db7d73c
- Classification: valuable
- Information Type: Configuration
- Reason: durable prompt/outcome signal
- Trigger Prompt Hash: b0664c28dbfd12b2

### Prompt Memory

Automation: Daily Mojo AI Summits Receipt Review
Automation ID: daily-mojo-ai-summits-receipt-review
Automation memory: $CODEX_HOME/automations/daily-mojo-ai-summits-receipt-review/memory.md
Review Mojo AI Summits budget receipts for the /budget profit-and-loss workflow. Work in C:\Users\scott\Code\aix. Use the existing Cloudflare/R2 storage configuration and local credentials only as needed, without printing secrets. Confirm the /budget API ingests all receipts under receipts/ as costs, create the daily receipt review snapshot if possible, and summarize new receipts, receipts missing dollar amounts, reviewed/reimbursed totals, and any errors that need Scott's attention. Mandatory completion

[Prompt excerpt truncated by Obsidianify.]

### Assistant Outcome

What is the specific event or offer we’re inviting them to?

For example: a Mojo AI Summit, private executive dinner, webinar, sponsor conversation, local meetup, or something else.
## 2026-08-11T19:10:38-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\11\rollout-2026-08-11T19-07-56-019ff382-fe5f-7863-a75f-6961f2420f2a.jsonl
- Turn Id: 019ff385-154e-7ba2-b8e1-34abf9e1aa6d
- Classification: valuable
- Information Type: Configuration
- Reason: durable prompt/outcome signal
- Trigger Prompt Hash: b0664c28dbfd12b2

### Prompt Memory

Automation: Daily Mojo AI Summits Receipt Review
Automation ID: daily-mojo-ai-summits-receipt-review
Automation memory: $CODEX_HOME/automations/daily-mojo-ai-summits-receipt-review/memory.md
Review Mojo AI Summits budget receipts for the /budget profit-and-loss workflow. Work in C:\Users\scott\Code\aix. Use the existing Cloudflare/R2 storage configuration and local credentials only as needed, without printing secrets. Confirm the /budget API ingests all receipts under receipts/ as costs, create the daily receipt review snapshot if possible, and summarize new receipts, receipts missing dollar amounts, reviewed/reimbursed totals, and any errors that need Scott's attention. Mandatory completion

[Prompt excerpt truncated by Obsidianify.]

### Assistant Outcome

Great. Next question:

Which titles should we prioritize first for “executives leading organizational AI efforts”?

Examples: Chief AI Officer, Chief Data Officer, CIO, CTO, Chief Innovation Officer, VP/Director of AI, VP/Director of Data, VP/Director of Digital Transformation, Head of AI Strategy.
## 2026-08-11T19:11:42-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\11\rollout-2026-08-11T19-07-56-019ff382-fe5f-7863-a75f-6961f2420f2a.jsonl
- Turn Id: 019ff385-6fca-7420-a43c-74ef9a29c767
- Classification: valuable
- Information Type: Configuration
- Reason: durable prompt/outcome signal
- Trigger Prompt Hash: b0664c28dbfd12b2

### Prompt Memory

Automation: Daily Mojo AI Summits Receipt Review
Automation ID: daily-mojo-ai-summits-receipt-review
Automation memory: $CODEX_HOME/automations/daily-mojo-ai-summits-receipt-review/memory.md
Review Mojo AI Summits budget receipts for the /budget profit-and-loss workflow. Work in C:\Users\scott\Code\aix. Use the existing Cloudflare/R2 storage configuration and local credentials only as needed, without printing secrets. Confirm the /budget API ingests all receipts under receipts/ as costs, create the daily receipt review snapshot if possible, and summarize new receipts, receipts missing dollar amounts, reviewed/reimbursed totals, and any errors that need Scott's attention. Mandatory completion

[Prompt excerpt truncated by Obsidianify.]

### Assistant Outcome

Good hierarchy. Next question:

What company profile should we target first?

For example: enterprise only, mid-market and enterprise, specific industries, specific geographies, specific headcount/revenue range, or companies visibly adopting AI.
## 2026-08-11T19:12:16-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\11\rollout-2026-08-11T19-07-56-019ff382-fe5f-7863-a75f-6961f2420f2a.jsonl
- Turn Id: 019ff386-62c6-7443-b4bb-2a33a666d432
- Classification: valuable
- Information Type: Configuration
- Reason: durable prompt/outcome signal
- Trigger Prompt Hash: b0664c28dbfd12b2

### Prompt Memory

Automation: Daily Mojo AI Summits Receipt Review
Automation ID: daily-mojo-ai-summits-receipt-review
Automation memory: $CODEX_HOME/automations/daily-mojo-ai-summits-receipt-review/memory.md
Review Mojo AI Summits budget receipts for the /budget profit-and-loss workflow. Work in C:\Users\scott\Code\aix. Use the existing Cloudflare/R2 storage configuration and local credentials only as needed, without printing secrets. Confirm the /budget API ingests all receipts under receipts/ as costs, create the daily receipt review snapshot if possible, and summarize new receipts, receipts missing dollar amounts, reviewed/reimbursed totals, and any errors that need Scott's attention. Mandatory completion

[Prompt excerpt truncated by Obsidianify.]

### Assistant Outcome

Good, that gives us a strong account filter:

**Target accounts so far:** US-based mid-market first, with upside into Fortune 2500 / Fortune 1250 where reachable, prioritizing Dallas, Denver, Raleigh, and Chicago. No industry restriction yet.

Next question:

What kind of AI responsibility makes someone a real fit?

For example: owns enterprise AI strategy, leads AI governance, runs AI transformation, manages data/analytics for AI, evaluates AI vendors, builds internal AI products, leads workforce adoption, or sponsors AI risk/compliance.
## 2026-08-11T19:12:49-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\11\rollout-2026-08-11T19-07-56-019ff382-fe5f-7863-a75f-6961f2420f2a.jsonl
- Turn Id: 019ff386-eb1b-7813-9f2b-a1c2537a2992
- Classification: valuable
- Information Type: Configuration
- Reason: durable prompt/outcome signal
- Trigger Prompt Hash: b0664c28dbfd12b2

### Prompt Memory

Automation: Daily Mojo AI Summits Receipt Review
Automation ID: daily-mojo-ai-summits-receipt-review
Automation memory: $CODEX_HOME/automations/daily-mojo-ai-summits-receipt-review/memory.md
Review Mojo AI Summits budget receipts for the /budget profit-and-loss workflow. Work in C:\Users\scott\Code\aix. Use the existing Cloudflare/R2 storage configuration and local credentials only as needed, without printing secrets. Confirm the /budget API ingests all receipts under receipts/ as costs, create the daily receipt review snapshot if possible, and summarize new receipts, receipts missing dollar amounts, reviewed/reimbursed totals, and any errors that need Scott's attention. Mandatory completion

[Prompt excerpt truncated by Obsidianify.]

### Assistant Outcome

That’s useful: we should optimize for **visible interest signals**, not prove ownership.

Next question:

What LinkedIn signals should count as interest?

Examples: AI in headline/title, recent AI posts/comments, AI talks/panels, AI newsletters, “digital transformation” language, data/analytics leadership, GenAI/automation projects, membership in AI groups, recent AI certifications, or company AI initiatives.
## 2026-08-11T19:13:09-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\11\rollout-2026-08-11T19-07-56-019ff382-fe5f-7863-a75f-6961f2420f2a.jsonl
- Turn Id: 019ff387-6cca-7cd3-ba11-0af5babfe8e9
- Classification: valuable
- Information Type: Configuration
- Reason: durable prompt/outcome signal
- Trigger Prompt Hash: b0664c28dbfd12b2

### Prompt Memory

Automation: Daily Mojo AI Summits Receipt Review
Automation ID: daily-mojo-ai-summits-receipt-review
Automation memory: $CODEX_HOME/automations/daily-mojo-ai-summits-receipt-review/memory.md
Review Mojo AI Summits budget receipts for the /budget profit-and-loss workflow. Work in C:\Users\scott\Code\aix. Use the existing Cloudflare/R2 storage configuration and local credentials only as needed, without printing secrets. Confirm the /budget API ingests all receipts under receipts/ as costs, create the daily receipt review snapshot if possible, and summarize new receipts, receipts missing dollar amounts, reviewed/reimbursed totals, and any errors that need Scott's attention. Mandatory completion

[Prompt excerpt truncated by Obsidianify.]

### Assistant Outcome

Perfect. Next question:

Should we include consultants, agency leaders, vendors, and fractional executives if they fit the AI/executive profile, or exclude them to keep the council buyer/operator-heavy?
## 2026-08-11T19:13:29-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\11\rollout-2026-08-11T19-07-56-019ff382-fe5f-7863-a75f-6961f2420f2a.jsonl
- Turn Id: 019ff387-b92d-7cf3-a316-9f2fcf9beba2
- Classification: valuable
- Information Type: Configuration
- Reason: durable prompt/outcome signal
- Trigger Prompt Hash: b0664c28dbfd12b2

### Prompt Memory

Automation: Daily Mojo AI Summits Receipt Review
Automation ID: daily-mojo-ai-summits-receipt-review
Automation memory: $CODEX_HOME/automations/daily-mojo-ai-summits-receipt-review/memory.md
Review Mojo AI Summits budget receipts for the /budget profit-and-loss workflow. Work in C:\Users\scott\Code\aix. Use the existing Cloudflare/R2 storage configuration and local credentials only as needed, without printing secrets. Confirm the /budget API ingests all receipts under receipts/ as costs, create the daily receipt review snapshot if possible, and summarize new receipts, receipts missing dollar amounts, reviewed/reimbursed totals, and any errors that need Scott's attention. Mandatory completion

[Prompt excerpt truncated by Obsidianify.]

### Assistant Outcome

Got it: include fractional executives, exclude consultants/agencies/vendors.

Next question:

Do you want the list optimized for **quality and personalization** or **volume and speed** first?

For example, 100 deeply qualified names with fit notes, or 500 lighter-qualified names that we enrich and triage later.
## 2026-08-11T19:13:46-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\11\rollout-2026-08-11T19-07-56-019ff382-fe5f-7863-a75f-6961f2420f2a.jsonl
- Turn Id: 019ff388-09c2-7ae2-a76d-fe8d1d8a3f69
- Classification: valuable
- Information Type: Configuration
- Reason: durable prompt/outcome signal
- Trigger Prompt Hash: b0664c28dbfd12b2

### Prompt Memory

Automation: Daily Mojo AI Summits Receipt Review
Automation ID: daily-mojo-ai-summits-receipt-review
Automation memory: $CODEX_HOME/automations/daily-mojo-ai-summits-receipt-review/memory.md
Review Mojo AI Summits budget receipts for the /budget profit-and-loss workflow. Work in C:\Users\scott\Code\aix. Use the existing Cloudflare/R2 storage configuration and local credentials only as needed, without printing secrets. Confirm the /budget API ingests all receipts under receipts/ as costs, create the daily receipt review snapshot if possible, and summarize new receipts, receipts missing dollar amounts, reviewed/reimbursed totals, and any errors that need Scott's attention. Mandatory completion

[Prompt excerpt truncated by Obsidianify.]

### Assistant Outcome

Good. Next question:

What fields do you want in the invite list?

My default would be: `Name`, `Title`, `Company`, `City`, `LinkedIn URL`, `Seniority`, `AI Interest Signal`, `Signal Source`, `Fit Rationale`, `Priority`, `Suggested Invite Angle`, `Outreach Status`.
## 2026-08-11T19:13:54-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\11\rollout-2026-08-11T19-07-56-019ff382-fe5f-7863-a75f-6961f2420f2a.jsonl
- Turn Id: 019ff388-4dab-7351-acdd-e1df9c8778eb
- Classification: valuable
- Information Type: Configuration
- Reason: durable prompt/outcome signal
- Trigger Prompt Hash: b0664c28dbfd12b2

### Prompt Memory

Automation: Daily Mojo AI Summits Receipt Review
Automation ID: daily-mojo-ai-summits-receipt-review
Automation memory: $CODEX_HOME/automations/daily-mojo-ai-summits-receipt-review/memory.md
Review Mojo AI Summits budget receipts for the /budget profit-and-loss workflow. Work in C:\Users\scott\Code\aix. Use the existing Cloudflare/R2 storage configuration and local credentials only as needed, without printing secrets. Confirm the /budget API ingests all receipts under receipts/ as costs, create the daily receipt review snapshot if possible, and summarize new receipts, receipts missing dollar amounts, reviewed/reimbursed totals, and any errors that need Scott's attention. Mandatory completion

[Prompt excerpt truncated by Obsidianify.]

### Assistant Outcome

Great. Next question:

How should we prioritize cities?

Should it be strict order like `Dallas > Denver > Raleigh > Chicago`, equal priority across all four, or weighted some other way?
## 2026-08-11T19:14:31-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\11\rollout-2026-08-11T19-07-56-019ff382-fe5f-7863-a75f-6961f2420f2a.jsonl
- Turn Id: 019ff388-6883-77c2-8003-51ebbc12575d
- Classification: valuable
- Information Type: Configuration
- Reason: durable prompt/outcome signal
- Trigger Prompt Hash: b0664c28dbfd12b2

### Prompt Memory

Automation: Daily Mojo AI Summits Receipt Review
Automation ID: daily-mojo-ai-summits-receipt-review
Automation memory: $CODEX_HOME/automations/daily-mojo-ai-summits-receipt-review/memory.md
Review Mojo AI Summits budget receipts for the /budget profit-and-loss workflow. Work in C:\Users\scott\Code\aix. Use the existing Cloudflare/R2 storage configuration and local credentials only as needed, without printing secrets. Confirm the /budget API ingests all receipts under receipts/ as costs, create the daily receipt review snapshot if possible, and summarize new receipts, receipts missing dollar amounts, reviewed/reimbursed totals, and any errors that need Scott's attention. Mandatory completion

[Prompt excerpt truncated by Obsidianify.]

### Assistant Outcome

I’ll take “yes” as the strict order:

**Dallas > Denver > Raleigh > Chicago**

Next question:

For company size, what range counts as mid-market for this list?

Common options: `100-999`, `250-2,500`, `500-5,000`, or revenue-based instead of headcount.
## 2026-08-11T19:14:48-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\11\rollout-2026-08-11T19-07-56-019ff382-fe5f-7863-a75f-6961f2420f2a.jsonl
- Turn Id: 019ff388-f54b-7082-839f-5b23b87e80af
- Classification: valuable
- Information Type: Configuration
- Reason: durable prompt/outcome signal
- Trigger Prompt Hash: b0664c28dbfd12b2

### Prompt Memory

Automation: Daily Mojo AI Summits Receipt Review
Automation ID: daily-mojo-ai-summits-receipt-review
Automation memory: $CODEX_HOME/automations/daily-mojo-ai-summits-receipt-review/memory.md
Review Mojo AI Summits budget receipts for the /budget profit-and-loss workflow. Work in C:\Users\scott\Code\aix. Use the existing Cloudflare/R2 storage configuration and local credentials only as needed, without printing secrets. Confirm the /budget API ingests all receipts under receipts/ as costs, create the daily receipt review snapshot if possible, and summarize new receipts, receipts missing dollar amounts, reviewed/reimbursed totals, and any errors that need Scott's attention. Mandatory completion

[Prompt excerpt truncated by Obsidianify.]

### Assistant Outcome

Perfect. Company size priority:

1. **Preferred:** 2,500-10,000 employees
2. **Secondary:** 1,000+ employees
3. **Selective stretch:** larger enterprises only when there’s a strong signal or accessible executive

Next question:

Do we want to target executives at **company headquarters in those cities**, or executives who are personally **located in those metro areas** even if their company is headquartered elsewhere?
## 2026-08-11T19:17:03-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\11\rollout-2026-08-11T19-07-56-019ff382-fe5f-7863-a75f-6961f2420f2a.jsonl
- Turn Id: 019ff389-89c5-7af1-8ed6-64cf0dc541e4
- Classification: valuable
- Information Type: Configuration
- Reason: durable prompt/outcome signal
- Trigger Prompt Hash: b0664c28dbfd12b2

### Prompt Memory

Automation: Daily Mojo AI Summits Receipt Review
Automation ID: daily-mojo-ai-summits-receipt-review
Automation memory: $CODEX_HOME/automations/daily-mojo-ai-summits-receipt-review/memory.md
Review Mojo AI Summits budget receipts for the /budget profit-and-loss workflow. Work in C:\Users\scott\Code\aix. Use the existing Cloudflare/R2 storage configuration and local credentials only as needed, without printing secrets. Confirm the /budget API ingests all receipts under receipts/ as costs, create the daily receipt review snapshot if possible, and summarize new receipts, receipts missing dollar amounts, reviewed/reimbursed totals, and any errors that need Scott's attention. Mandatory completion

[Prompt excerpt truncated by Obsidianify.]

### Assistant Outcome

Excellent. Then I’d define the working profile like this:

**Executive Research Council Invite Profile**

Audience: executives leading or visibly interested in organizational AI efforts.

Seniority: Director+
Priority order: `CxO > EVP > SVP > VP > Director`

Location priority: person located in:
1. Dallas
2. Denver
3. Raleigh
4. Chicago

Company size:
1. Preferred: `2,500-10,000 employees`
2. Secondary: `1,000+ employees`
3. Larger enterprises only if there is a strong fit signal or reachable contact path

Included:
- Corporate executives
- Fractional executives

Excluded:
- Consultants
- Agencies
- Vendors

Interest signals:
1. AI-related posts
2. AI language in profile/headline/about section
3. AI-related comments
4. If no visible signal: title + market size can still qualify as lower priority

Fields:
`Name`, `Title`, `Company`, `City`, `LinkedIn URL`, `Seniority`, `AI Interest Signal`, `Signal Source`, `Fit Rationale`, `Priority`, `Suggested Invite Angle`, `Outreach Status`

**Priority Rules**

A-priority:
Director+ in Dallas/Denver/Raleigh/Chicago, at a 2,500-10,000 employee company, non-vendor/non-consultant, with a visible AI signal from posts/profile/comments.

B-priority:
Director+ in target city, at 1,000+ employee company, with either a relevant title or weak AI signal.

C-priority:
Director+ in target city with relevant AI/data/digital title, but weak company-size fit or no visible AI signal.

Next I’d turn this into LinkedIn Sales Navigator searches by city and seniority, then manually qualify A-priority leads with personalization notes before enriching email.
