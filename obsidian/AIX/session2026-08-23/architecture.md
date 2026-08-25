## 2026-08-23T13:27:42-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\14\rollout-2026-08-14T09-21-12-01a000dc-e695-7072-a1a2-fd6a0806acc0.jsonl
- Turn Id: 01a024d5-0051-79a0-bc75-960dc0ee3625
- Classification: valuable
- Information Type: Architecture
- Reason: durable prompt/outcome signal
- Trigger Prompt Hash: b0664c28dbfd12b2

### Prompt Memory

Automation: Daily Mojo AI Summits Receipt Review
Automation ID: daily-mojo-ai-summits-receipt-review
Automation memory: $CODEX_HOME/automations/daily-mojo-ai-summits-receipt-review/memory.md
Review Mojo AI Summits budget receipts for the /budget profit-and-loss workflow. Work in C:\Users\scott\Code\aix. Use the existing Cloudflare/R2 storage configuration and local credentials only as needed, without printing secrets. Confirm the /budget API ingests all receipts under receipts/ as costs, create the daily receipt review snapshot if possible, and summarize new receipts, receipts missing dollar amounts, reviewed/reimbursed totals, and any errors that need Scott's attention. Mandatory completion

[Prompt excerpt truncated by Obsidianify.]

### Assistant Outcome

Deployed.

PR #161 merged: [Fix Guest Matrix filters and event grouping](https://github.com/AesopScott/aix/pull/161)
Version bumped to `0.1.133`. Cloudflare Pages run `32495368699` succeeded, and production `/crm/` is returning `200` with the new Guest Matrix show/role filter code present.

Timing:
- Audit + clean branch setup: about 30s
- Validation + commit: about 15s
- Push, PR, merge: about 20s
- Cloudflare Pages deploy: 32s
- Production verification: about 2s

::git-create-branch{cwd="C:\Users\scott\Code\aix\tmp\deploy-guest-matrix-filter-grouping-20260821" branch="codex/guest-matrix-filter-grouping-20260821"}
::git-stage{cwd="C:\Users\scott\Code\aix\tmp\deploy-guest-matrix-filter-grouping-20260821"}
::git-commit{cwd="C:\Users\scott\Code\aix\tmp\deploy-guest-matrix-filter-grouping-20260821"}
::git-push{cwd="C:\Users\scott\Code\aix\tmp\deploy-guest-matrix-filter-grouping-20260821" branch="codex/guest-matrix-filter-grouping-20260821"}
::git-create-pr{cwd="C:\Users\scott\Code\aix\tmp\deploy-guest-matrix-filter-grouping-20260821" branch="codex/guest-matrix-filter-grouping-20260821" url="https://github.com/AesopScott/aix/pull/161" isDraft=false}
## 2026-08-23T13:31:35-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\14\rollout-2026-08-14T09-21-12-01a000dc-e695-7072-a1a2-fd6a0806acc0.jsonl
- Turn Id: 01a03015-d274-70c0-b102-939f1462b95a
- Classification: valuable
- Information Type: Architecture
- Reason: durable implementation outcome
- Trigger Prompt Hash: b0664c28dbfd12b2

### Prompt Memory

Automation: Daily Mojo AI Summits Receipt Review
Automation ID: daily-mojo-ai-summits-receipt-review
Automation memory: $CODEX_HOME/automations/daily-mojo-ai-summits-receipt-review/memory.md
Review Mojo AI Summits budget receipts for the /budget profit-and-loss workflow. Work in C:\Users\scott\Code\aix. Use the existing Cloudflare/R2 storage configuration and local credentials only as needed, without printing secrets. Confirm the /budget API ingests all receipts under receipts/ as costs, create the daily receipt review snapshot if possible, and summarize new receipts, receipts missing dollar amounts, reviewed/reimbursed totals, and any errors that need Scott's attention. Mandatory completion

[Prompt excerpt truncated by Obsidianify.]

### Assistant Outcome

Fixed locally.

Guest Registration now uses only this lifecycle for individual status dropdowns and the status filter:

`Contacted`, `Confirmed`, `Declined`, `Bad Fit`, `Invited`, `Registered`, `Alternate`, `Attended`, `No Show`.

I also added normalization so old guest values like `new`, `accepted`, `waitlist`, `opened`, or `started` won’t leak back into the UI. They’ll map into the Guest Registration lifecycle instead.

Changed:
- [dist/crm/index.html](C:/Users/scott/Code/aix/dist/crm/index.html)
- [functions/api/crm.js](C:/Users/scott/Code/aix/functions/api/crm.js)

Validation passed:
- CRM page script parse check
- API syntax check
- `git diff --check`

Not deployed yet.
## 2026-08-23T13:38:39-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\23\rollout-2026-08-23T13-26-55-01a03017-17c7-7153-8283-b592ff7ca5c6.jsonl
- Turn Id: 01a03017-1cd9-7c81-b0ec-597a99fc24fe
- Classification: valuable
- Information Type: Architecture
- Reason: durable implementation outcome
- Trigger Prompt Hash: b0664c28dbfd12b2

### Prompt Memory

Automation: Daily Mojo AI Summits Receipt Review
Automation ID: daily-mojo-ai-summits-receipt-review
Automation memory: $CODEX_HOME/automations/daily-mojo-ai-summits-receipt-review/memory.md
Review Mojo AI Summits budget receipts for the /budget profit-and-loss workflow. Work in C:\Users\scott\Code\aix. Use the existing Cloudflare/R2 storage configuration and local credentials only as needed, without printing secrets. Confirm the /budget API ingests all receipts under receipts/ as costs, create the daily receipt review snapshot if possible, and summarize new receipts, receipts missing dollar amounts, reviewed/reimbursed totals, and any errors that need Scott's attention. Mandatory completion

[Prompt excerpt truncated by Obsidianify.]

### Assistant Outcome

Fixed the CRM discoverability gap.

I made the pre-invite flow explicit in [dist/crm/index.html](C:/Users/scott/Code/aix/dist/crm/index.html:1581): the side nav now says `Add Guests Before Invite` and `Add Partners Before Invite`, and the guest/partner invite creation panels include direct buttons into those forms.

I also added the missing partner invite fields in [dist/crm/index.html](C:/Users/scott/Code/aix/dist/crm/index.html:1940): show time and partner contact name. On the API side, [functions/api/crm.js](C:/Users/scott/Code/aix/functions/api/crm.js:4469) now persists `partnerContactName` on partner invite creation and forces featured partner invites to a single show when needed.

Verification passed:
`node --check functions/api/crm.js`
inline CRM script parse check
source checks for the new nav/buttons/fields

Small note: these two files were already dirty when I started, so I kept this scoped and did not touch unrelated repo changes or deploy anything.
## 2026-08-23T13:45:49-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\23\rollout-2026-08-23T13-26-55-01a03017-17c7-7153-8283-b592ff7ca5c6.jsonl
- Turn Id: 01a03025-a4b1-78c3-9fe9-42cd9ae2d580
- Classification: valuable
- Information Type: Architecture
- Reason: durable implementation outcome
- Trigger Prompt Hash: b0664c28dbfd12b2

### Prompt Memory

Automation: Daily Mojo AI Summits Receipt Review
Automation ID: daily-mojo-ai-summits-receipt-review
Automation memory: $CODEX_HOME/automations/daily-mojo-ai-summits-receipt-review/memory.md
Review Mojo AI Summits budget receipts for the /budget profit-and-loss workflow. Work in C:\Users\scott\Code\aix. Use the existing Cloudflare/R2 storage configuration and local credentials only as needed, without printing secrets. Confirm the /budget API ingests all receipts under receipts/ as costs, create the daily receipt review snapshot if possible, and summarize new receipts, receipts missing dollar amounts, reviewed/reimbursed totals, and any errors that need Scott's attention. Mandatory completion

[Prompt excerpt truncated by Obsidianify.]

### Assistant Outcome

Done. The matrix/dashboard now includes a `Created` column for each tracked person row, using the record’s `createdAt` timestamp and formatting it with the existing CRM date formatter.

I also preserved the earliest `createdAt` when duplicate matrix rows merge, so the displayed date stays tied to when that person/event tracking record first entered the matrix.

Verified:
- CRM inline script parse check
- `node --check functions/api/crm.js`
## 2026-08-23T13:51:33-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\23\rollout-2026-08-23T13-26-55-01a03017-17c7-7153-8283-b592ff7ca5c6.jsonl
- Turn Id: 01a03026-7a43-7c83-a2e6-344aff6f0eaf
- Classification: valuable
- Information Type: Architecture
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

PR [#166](https://github.com/AesopScott/aix/pull/166) was merged to `main`, version is now `0.1.137`, and the Cloudflare Pages GitHub Actions run succeeded: [run 32662409741](https://github.com/AesopScott/aix/actions/runs/32662409741).

Shipped changes:
- CRM matrix can add/track people before invite using LinkedIn-only identity.
- LinkedIn is used as the durable contact key when email is missing.
- Matrix statuses now match guest registration lifecycle: Contacted, Confirmed, Declined, Bad Fit, Invited, Registered, Alternate, Attended, No Show.
- Dashboard matrix shows the record created date.

Verified with:
- `node --check functions/api/crm.js`
- CRM inline script parse
- Source checks for LinkedIn input, created column, lifecycle statuses, old status headers removed, backend LinkedIn identity/enrichment

Timing: tracked deploy window was about 4m03s from recovered deploy clock to production verification. One unrelated tracked file remains unstaged: `obsidian/AIX/Partner Prospecting Engine.md`.

::git-stage{cwd="C:\Users\scott\Code\aix"}
::git-commit{cwd="C:\Users\scott\Code\aix"}
::git-push{cwd="C:\Users\scott\Code\aix" branch="codex/virtual-title-permissions-20260821"}
::git-create-pr{cwd="C:\Users\scott\Code\aix" branch="codex/virtual-title-permissions-20260821" url="https://github.com/AesopScott/aix/pull/166" isDraft=false}
## 2026-08-23T13:54:25-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\23\rollout-2026-08-23T13-26-55-01a03017-17c7-7153-8283-b592ff7ca5c6.jsonl
- Turn Id: 01a0302c-e2f1-75a3-ada6-a5519cd8b744
- Classification: valuable
- Information Type: Architecture
- Reason: durable implementation outcome
- Trigger Prompt Hash: b0664c28dbfd12b2

### Prompt Memory

Automation: Daily Mojo AI Summits Receipt Review
Automation ID: daily-mojo-ai-summits-receipt-review
Automation memory: $CODEX_HOME/automations/daily-mojo-ai-summits-receipt-review/memory.md
Review Mojo AI Summits budget receipts for the /budget profit-and-loss workflow. Work in C:\Users\scott\Code\aix. Use the existing Cloudflare/R2 storage configuration and local credentials only as needed, without printing secrets. Confirm the /budget API ingests all receipts under receipts/ as costs, create the daily receipt review snapshot if possible, and summarize new receipts, receipts missing dollar amounts, reviewed/reimbursed totals, and any errors that need Scott's attention. Mandatory completion

[Prompt excerpt truncated by Obsidianify.]

### Assistant Outcome

You’re not crazy. I renamed the sidebar entry from **Guest Matrix** to **Add Guests Before Invite**, which made it look like the Guest Matrix disappeared.

I restored the visible CRM sidebar labels in [dist/crm/index.html](C:/Users/scott/Code/aix/dist/crm/index.html:1581):
- **Guest Matrix**
- **Partner Matrix**

The add-before-invite form is still inside Guest Matrix, including the LinkedIn-only field. I verified the CRM inline script still parses and the route/form are still present.

I have not deployed this label fix yet because your last message was not an explicit deploy request. Use `deploy` and I’ll ship this small correction.
## 2026-08-23T13:58:37-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\23\rollout-2026-08-23T13-26-55-01a03017-17c7-7153-8283-b592ff7ca5c6.jsonl
- Turn Id: 01a0302d-aa95-7121-81e4-32bc29b33304
- Classification: valuable
- Information Type: Architecture
- Reason: durable implementation outcome
- Trigger Prompt Hash: b0664c28dbfd12b2

### Prompt Memory

Automation: Daily Mojo AI Summits Receipt Review
Automation ID: daily-mojo-ai-summits-receipt-review
Automation memory: $CODEX_HOME/automations/daily-mojo-ai-summits-receipt-review/memory.md
Review Mojo AI Summits budget receipts for the /budget profit-and-loss workflow. Work in C:\Users\scott\Code\aix. Use the existing Cloudflare/R2 storage configuration and local credentials only as needed, without printing secrets. Confirm the /budget API ingests all receipts under receipts/ as costs, create the daily receipt review snapshot if possible, and summarize new receipts, receipts missing dollar amounts, reviewed/reimbursed totals, and any errors that need Scott's attention. Mandatory completion

[Prompt excerpt truncated by Obsidianify.]

### Assistant Outcome

You’re right. I wasted a loop there, and I’m sorry.

Deployed again. The CRM sidebar now shows **Guest Matrix** and **Partner Matrix** again, with the pre-invite LinkedIn tracking still inside those matrix pages.

PR: [#167](https://github.com/AesopScott/aix/pull/167)
Merged commit: `9d8f842`
Version: `0.1.138`
Cloudflare Pages deploy: [run 32662671444](https://github.com/AesopScott/aix/actions/runs/32662671444), successful

Verification passed:
- CRM inline script parse
- Guest Matrix nav label present
- Partner Matrix nav label present
- Guest Matrix pre-invite LinkedIn form still present

Timing:
- Phase 1 inspect/scope: ~18s, cumulative ~18s
- Phase 2 fetch/clean branch: ~29s, cumulative ~47s
- Phase 3 apply fix/version: ~23s, cumulative ~1m10s
- Phase 4 verify: ~15s, cumulative ~1m25s
- Phase 5 stage/commit/push: ~16s, cumulative ~1m41s
- Phase 6 PR/merge: ~31s, cumulative ~2m12s
- Phase 7 Cloudflare deploy: ~43s, cumulative ~2m55s
- Phase 8 final verify/cleanup: ~25s, cumulative ~3m20s

One unrelated local file remains unstaged as before: `obsidian/AIX/Partner Prospecting Engine.md`.

::git-create-branch{cwd="C:\Users\scott\Code\aix" branch="codex/guest-matrix-label-20260823"}
::git-stage{cwd="C:\Users\scott\Code\aix"}
::git-commit{cwd="C:\Users\scott\Code\aix"}
::git-push{cwd="C:\Users\scott\Code\aix" branch="codex/guest-matrix-label-20260823"}
::git-create-pr{cwd="C:\Users\scott\Code\aix" branch="codex/guest-matrix-label-20260823" url="https://github.com/AesopScott/aix/pull/167" isDraft=false}
## 2026-08-23T14:00:50-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\23\rollout-2026-08-23T13-26-55-01a03017-17c7-7153-8283-b592ff7ca5c6.jsonl
- Turn Id: 01a03030-c476-76a3-9287-ea1b265dbf28
- Classification: valuable
- Information Type: Architecture
- Reason: durable implementation outcome
- Trigger Prompt Hash: b0664c28dbfd12b2

### Prompt Memory

Automation: Daily Mojo AI Summits Receipt Review
Automation ID: daily-mojo-ai-summits-receipt-review
Automation memory: $CODEX_HOME/automations/daily-mojo-ai-summits-receipt-review/memory.md
Review Mojo AI Summits budget receipts for the /budget profit-and-loss workflow. Work in C:\Users\scott\Code\aix. Use the existing Cloudflare/R2 storage configuration and local credentials only as needed, without printing secrets. Confirm the /budget API ingests all receipts under receipts/ as costs, create the daily receipt review snapshot if possible, and summarize new receipts, receipts missing dollar amounts, reviewed/reimbursed totals, and any errors that need Scott's attention. Mandatory completion

[Prompt excerpt truncated by Obsidianify.]

### Assistant Outcome

Fixed locally. You can now add a tracked guest with only a LinkedIn URL.

What changed:
- Removed the required event constraint from [dist/crm/index.html](C:/Users/scott/Code/aix/dist/crm/index.html:1779).
- Matrix event selector now defaults to **No event yet**, while invite-link creation still requires/selects an event.
- Removed the frontend “select an event before adding” blocker.
- Updated the API so missing event/show data is valid and stored as an unassigned matrix record in [functions/api/crm.js](C:/Users/scott/Code/aix/functions/api/crm.js:4344).

Verified:
- `node --check functions/api/crm.js`
- CRM inline script parse
- Checks for LinkedIn-only validation, no event blocker, and unassigned backend storage

One honest note: without a connected enrichment source or logged-in LinkedIn scraping flow, the CRM can only infer what it can from existing CRM records matching that LinkedIn URL, plus a name from the profile slug. But it will no longer force name, email, event, owner, or company when LinkedIn is the only thing you have.
## 2026-08-23T14:03:30-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\23\rollout-2026-08-23T13-26-55-01a03017-17c7-7153-8283-b592ff7ca5c6.jsonl
- Turn Id: 01a03034-33c4-7be0-a9cc-56efa37cbde3
- Classification: valuable
- Information Type: Architecture
- Reason: durable implementation outcome
- Trigger Prompt Hash: b0664c28dbfd12b2

### Prompt Memory

Automation: Daily Mojo AI Summits Receipt Review
Automation ID: daily-mojo-ai-summits-receipt-review
Automation memory: $CODEX_HOME/automations/daily-mojo-ai-summits-receipt-review/memory.md
Review Mojo AI Summits budget receipts for the /budget profit-and-loss workflow. Work in C:\Users\scott\Code\aix. Use the existing Cloudflare/R2 storage configuration and local credentials only as needed, without printing secrets. Confirm the /budget API ingests all receipts under receipts/ as costs, create the daily receipt review snapshot if possible, and summarize new receipts, receipts missing dollar amounts, reviewed/reimbursed totals, and any errors that need Scott's attention. Mandatory completion

[Prompt excerpt truncated by Obsidianify.]

### Assistant Outcome

Done locally.

I changed the pre-contact stage to **Pending Engagement** and wired it through the matrix:

- New lifecycle value: `pending-engagement`
- New label: **Pending Engagement**
- LinkedIn-only / no-event adds now default to **Pending Engagement**, not Contacted
- Existing `tracking`, `new`, `not-registered`, and old `pending-angel` aliases map to **Pending Engagement**
- Guest Matrix status filter includes **Pending Engagement**
- The filter already works against `row.registrationStatus`, so filtering Pending Engagement/Contacted uses the same path as the rest of the statuses

Verified:
- `node --check functions/api/crm.js`
- CRM inline script parse
- Source checks for Pending Engagement dropdown/filter/default behavior
- Confirmed LinkedIn-only with no event is still allowed

Not deployed yet.
## 2026-08-23T14:05:16-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\23\rollout-2026-08-23T13-26-55-01a03017-17c7-7153-8283-b592ff7ca5c6.jsonl
- Turn Id: 01a03036-29a0-75b2-981c-b04ce5153085
- Classification: valuable
- Information Type: Architecture
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

PR: [#168](https://github.com/AesopScott/aix/pull/168)
Merged commit: `b8ef969`
Version: `0.1.139`
Cloudflare Pages deploy: [run 32663149558](https://github.com/AesopScott/aix/actions/runs/32663149558), successful

Shipped:
- Added **Pending Engagement** as the pre-contact guest matrix stage.
- LinkedIn-only/no-event people now default to **Pending Engagement**, not Contacted.
- Guest Matrix filters include **Pending Engagement** and filter through the same `registrationStatus` path.
- No-event LinkedIn-only records stay unassigned until an event is added later.

Verification passed:
- `node --check functions/api/crm.js`
- CRM inline script parse
- Pending Engagement dropdown/filter/default checks
- LinkedIn-only/no-event allowance check

Timing:
- Phase 1 inspect/scope: ~11s, cumulative ~11s
- Phase 2 fetch/clean branch: ~20s, cumulative ~31s
- Phase 3 apply changes/version: ~21s, cumulative ~52s
- Phase 4 verify: ~16s, cumulative ~1m08s
- Phase 5 stage/commit/push: ~25s, cumulative ~1m33s
- Phase 6 PR/merge: ~32s, cumulative ~2m05s
- Phase 7 Cloudflare deploy: ~55s, cumulative ~3m00s
- Phase 8 final verify/cleanup: ~23s, cumulative ~3m23s

Unrelated local file still unstaged: `obsidian/AIX/Partner Prospecting Engine.md`.

::git-create-branch{cwd="C:\Users\scott\Code\aix" branch="codex/pending-engagement-matrix-20260823"}
::git-stage{cwd="C:\Users\scott\Code\aix"}
::git-commit{cwd="C:\Users\scott\Code\aix"}
::git-push{cwd="C:\Users\scott\Code\aix" branch="codex/pending-engagement-matrix-20260823"}
::git-create-pr{cwd="C:\Users\scott\Code\aix" branch="codex/pending-engagement-matrix-20260823" url="https://github.com/AesopScott/aix/pull/168" isDraft=false}
## 2026-08-23T14:08:11-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\23\rollout-2026-08-23T13-26-55-01a03017-17c7-7153-8283-b592ff7ca5c6.jsonl
- Turn Id: 01a03039-b451-7d02-897e-d35f6faff93c
- Classification: valuable
- Information Type: Architecture
- Reason: durable implementation outcome
- Trigger Prompt Hash: b0664c28dbfd12b2

### Prompt Memory

Automation: Daily Mojo AI Summits Receipt Review
Automation ID: daily-mojo-ai-summits-receipt-review
Automation memory: $CODEX_HOME/automations/daily-mojo-ai-summits-receipt-review/memory.md
Review Mojo AI Summits budget receipts for the /budget profit-and-loss workflow. Work in C:\Users\scott\Code\aix. Use the existing Cloudflare/R2 storage configuration and local credentials only as needed, without printing secrets. Confirm the /budget API ingests all receipts under receipts/ as costs, create the daily receipt review snapshot if possible, and summarize new receipts, receipts missing dollar amounts, reviewed/reimbursed totals, and any errors that need Scott's attention. Mandatory completion

[Prompt excerpt truncated by Obsidianify.]

### Assistant Outcome

Agreed, and I fixed that locally.

I removed the **Owner** field from the Guest/Partner Matrix pre-invite add form in [dist/crm/index.html](C:/Users/scott/Code/aix/dist/crm/index.html:1813). The frontend now sends `invitedBy: ""`, which lets the backend use the logged-in actor via the existing `payload.invitedBy || ... || actor` fallback.

Verified:
- CRM inline script parses
- Matrix Owner input is gone
- Backend actor fallback remains
- The actual invite creation forms still keep their valid **Invited By** fields

Not deployed yet.
## 2026-08-23T14:18:29-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\14\rollout-2026-08-14T09-21-12-01a000dc-e695-7072-a1a2-fd6a0806acc0.jsonl
- Turn Id: 01a03042-ac37-7252-a3c4-de5cc35525a9
- Classification: valuable
- Information Type: Architecture
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

PR #170 merged: [Fix Guest Matrix registered status tracking](https://github.com/AesopScott/aix/pull/170)
Production is live at [mojoaisummits.com/crm/](https://mojoaisummits.com/crm/), and I verified the deployed CRM includes the new Guest Matrix registered-status logic.

Version bumped to `0.1.141`. Cloudflare Pages run `32663894069` succeeded.

Timing:
- Phase 1 audit: ~17s
- Phase 2 clean branch + patch: ~49s
- Phase 3 validation: ~18s
- Phase 4 commit: ~10s
- Phase 5 PR + merge: ~32s
- Phase 6 Cloudflare deploy: ~43s
- Phase 7 production verification: ~7s
- Total: ~2m 56s

::git-create-branch{cwd="C:\Users\scott\Code\aix\tmp\deploy-guest-matrix-registered-status-20260823" branch="codex/guest-matrix-registered-status-20260823"}
::git-stage{cwd="C:\Users\scott\Code\aix\tmp\deploy-guest-matrix-registered-status-20260823"}
::git-commit{cwd="C:\Users\scott\Code\aix\tmp\deploy-guest-matrix-registered-status-20260823"}
::git-push{cwd="C:\Users\scott\Code\aix\tmp\deploy-guest-matrix-registered-status-20260823" branch="codex/guest-matrix-registered-status-20260823"}
::git-create-pr{cwd="C:\Users\scott\Code\aix\tmp\deploy-guest-matrix-registered-status-20260823" branch="codex/guest-matrix-registered-status-20260823" url="https://github.com/AesopScott/aix/pull/170" isDraft=false}
## 2026-08-23T14:22:14-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\14\rollout-2026-08-14T09-21-12-01a000dc-e695-7072-a1a2-fd6a0806acc0.jsonl
- Turn Id: 01a03045-5901-7331-97aa-aab07114b177
- Classification: valuable
- Information Type: Architecture
- Reason: durable implementation outcome
- Trigger Prompt Hash: b0664c28dbfd12b2

### Prompt Memory

Automation: Daily Mojo AI Summits Receipt Review
Automation ID: daily-mojo-ai-summits-receipt-review
Automation memory: $CODEX_HOME/automations/daily-mojo-ai-summits-receipt-review/memory.md
Review Mojo AI Summits budget receipts for the /budget profit-and-loss workflow. Work in C:\Users\scott\Code\aix. Use the existing Cloudflare/R2 storage configuration and local credentials only as needed, without printing secrets. Confirm the /budget API ingests all receipts under receipts/ as costs, create the daily receipt review snapshot if possible, and summarize new receipts, receipts missing dollar amounts, reviewed/reimbursed totals, and any errors that need Scott's attention. Mandatory completion

[Prompt excerpt truncated by Obsidianify.]

### Assistant Outcome

Fixed locally.

The junk was coming from the Future Events column, not the main Guest Status dropdown. It was taking the contact event that gets created for a matrix-only prospect and hardcoding it as `Registered`, even when the person had no invite link and no registration.

I changed it so:
- Matrix-only prospect/contact events are ignored in Future Events.
- Real contact/registration events use their actual lifecycle status.
- Your newly added `Pending Engagement` people won’t show a fake `Registered` pill under Future Events.

Validation passed: CRM script parse, API syntax checks, and diff whitespace check.

Not deployed yet.
## 2026-08-23T14:30:05-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\14\rollout-2026-08-14T09-21-12-01a000dc-e695-7072-a1a2-fd6a0806acc0.jsonl
- Turn Id: 01a03048-9971-70a3-8787-e2b0ba01de7c
- Classification: valuable
- Information Type: Architecture
- Reason: durable implementation outcome
- Trigger Prompt Hash: b0664c28dbfd12b2

### Prompt Memory

Automation: Daily Mojo AI Summits Receipt Review
Automation ID: daily-mojo-ai-summits-receipt-review
Automation memory: $CODEX_HOME/automations/daily-mojo-ai-summits-receipt-review/memory.md
Review Mojo AI Summits budget receipts for the /budget profit-and-loss workflow. Work in C:\Users\scott\Code\aix. Use the existing Cloudflare/R2 storage configuration and local credentials only as needed, without printing secrets. Confirm the /budget API ingests all receipts under receipts/ as costs, create the daily receipt review snapshot if possible, and summarize new receipts, receipts missing dollar amounts, reviewed/reimbursed totals, and any errors that need Scott's attention. Mandatory completion

[Prompt excerpt truncated by Obsidianify.]

### Assistant Outcome

Fixed locally.

The mess was from the Future Events merge: Jessica had multiple records for the same actual event with different show metadata: `Afternoon show`, `Both shows`, and blank. The matrix was treating those as three separate future events.

I changed it so Future Events now collapses by actual event/date, then prefers the most accurate show:
- For Jessica, it should keep the `Afternoon show` entry.
- It should discard stale `Both shows` / blank duplicates for that same event.
- Featured Guest remains single-show only.

Validation passed:
- CRM script parse
- API syntax checks
- Diff whitespace check

Not deployed yet.
## 2026-08-23T14:32:46-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\14\rollout-2026-08-14T09-21-12-01a000dc-e695-7072-a1a2-fd6a0806acc0.jsonl
- Turn Id: 01a03049-c248-7720-b015-917e2dfc169f
- Classification: valuable
- Information Type: Architecture
- Reason: durable implementation outcome
- Trigger Prompt Hash: b0664c28dbfd12b2

### Prompt Memory

Automation: Daily Mojo AI Summits Receipt Review
Automation ID: daily-mojo-ai-summits-receipt-review
Automation memory: $CODEX_HOME/automations/daily-mojo-ai-summits-receipt-review/memory.md
Review Mojo AI Summits budget receipts for the /budget profit-and-loss workflow. Work in C:\Users\scott\Code\aix. Use the existing Cloudflare/R2 storage configuration and local credentials only as needed, without printing secrets. Confirm the /budget API ingests all receipts under receipts/ as costs, create the daily receipt review snapshot if possible, and summarize new receipts, receipts missing dollar amounts, reviewed/reimbursed totals, and any errors that need Scott's attention. Mandatory completion

[Prompt excerpt truncated by Obsidianify.]

### Assistant Outcome

Done locally.

I split the note lanes correctly now:

- Guest Matrix pre-registration rows save `preRegistrationNotes`.
- Guest Matrix registered rows save/read `eventNotes`.
- Guest Registration notes save/read `eventNotes`.
- Contact notes remain separate as contact `crmNotes`.

I also added a pre-registration notes field when adding someone directly to the Guest Matrix, plus an editable Notes column in the matrix.

Validated with:
- `node --check functions/api/crm.js`
- `node --check functions/_registration-crm.js`
- CRM page script parse check
- `git diff --check`

Not deployed yet.
## 2026-08-23T14:36:41-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\14\rollout-2026-08-14T09-21-12-01a000dc-e695-7072-a1a2-fd6a0806acc0.jsonl
- Turn Id: 01a03050-f356-7eb1-b39e-dc4fe2a65d08
- Classification: valuable
- Information Type: Architecture
- Reason: durable implementation outcome
- Trigger Prompt Hash: b0664c28dbfd12b2

### Prompt Memory

Automation: Daily Mojo AI Summits Receipt Review
Automation ID: daily-mojo-ai-summits-receipt-review
Automation memory: $CODEX_HOME/automations/daily-mojo-ai-summits-receipt-review/memory.md
Review Mojo AI Summits budget receipts for the /budget profit-and-loss workflow. Work in C:\Users\scott\Code\aix. Use the existing Cloudflare/R2 storage configuration and local credentials only as needed, without printing secrets. Confirm the /budget API ingests all receipts under receipts/ as costs, create the daily receipt review snapshot if possible, and summarize new receipts, receipts missing dollar amounts, reviewed/reimbursed totals, and any errors that need Scott's attention. Mandatory completion

[Prompt excerpt truncated by Obsidianify.]

### Assistant Outcome

Fixed locally.

The Guest Registration filters were especially broken around Role: rows stored roles as `guestRegistrationType` / `registrationRole`, but the filter was mostly checking boolean flags. I changed the filter and the displayed role badges to use the same normalized role logic.

I also tightened Event and Company filtering:
- Event filter now has a fallback match path for registration/invite identifiers.
- Company filter now checks `company`, `partnerCompany`, or `organization`.

Validation passed: CRM script parse, API syntax checks, and diff check. Not deployed yet.
## 2026-08-23T14:54:02-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\12\rollout-2026-08-12T17-17-22-019ff844-2279-7d03-8399-9c9df429bac5.jsonl
- Turn Id: 01a025d1-27e4-7351-814e-d8c5f8612c19
- Classification: valuable
- Information Type: Architecture
- Reason: durable implementation outcome
- Trigger Prompt Hash: b0664c28dbfd12b2

### Prompt Memory

Automation: Daily Mojo AI Summits Receipt Review
Automation ID: daily-mojo-ai-summits-receipt-review
Automation memory: $CODEX_HOME/automations/daily-mojo-ai-summits-receipt-review/memory.md
Review Mojo AI Summits budget receipts for the /budget profit-and-loss workflow. Work in C:\Users\scott\Code\aix. Use the existing Cloudflare/R2 storage configuration and local credentials only as needed, without printing secrets. Confirm the /budget API ingests all receipts under receipts/ as costs, create the daily receipt review snapshot if possible, and summarize new receipts, receipts missing dollar amounts, reviewed/reimbursed totals, and any errors that need Scott's attention. Mandatory completion

[Prompt excerpt truncated by Obsidianify.]

### Assistant Outcome

Fixed locally. The error was Cloudflare’s per-invocation subrequest limit: KV `list/get/put` calls and outbound `fetch()` calls all count, and the discovery run was doing too much in one Worker request. Cloudflare documents that subrequests default to 50 on free Workers and 10,000 on paid Workers, configurable via Wrangler `limits.subrequests`: [Workers limits](https://developers.cloudflare.com/workers/platform/limits/) and [Wrangler limits config](https://developers.cloudflare.com/workers/wrangler/configuration/).

What I changed:
- [functions/api/crm.js](C:\Users\scott\Code\aix\functions\api\crm.js:2364): discovery dedupe now uses direct company-key lookup instead of hydrating the whole Vendor Universe.
- [functions/api/crm.js](C:\Users\scott\Code\aix\functions\api\crm.js:2989): each Worker source run now caps at 8 candidates, 5 new company saves, and 1 sponsor subpage crawl.
- [dist/crm/index.html](C:\Users\scott\Code\aix\dist\crm\index.html:6112): the “find 50” buttons still run as one button click, but the browser loops through smaller Worker-safe batches.
- [obsidian/AIX/Partner Prospecting Engine.md](C:\Users\scott\Code\aix\obsidian\AIX\Partner Prospecting Engine.md:29): added the durable note explaining the subrequest-budget design.

Validated with:
- `node --check functions/api/crm.js`
- inline CRM script parse check
- `git diff --check`

Not deployed yet, since this turn was not a deploy request.
## 2026-08-23T15:07:46-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\14\rollout-2026-08-14T09-21-12-01a000dc-e695-7072-a1a2-fd6a0806acc0.jsonl
- Turn Id: 01a0306d-6f60-70e0-96c4-79e3c7b50022
- Classification: valuable
- Information Type: Architecture
- Reason: durable implementation outcome
- Trigger Prompt Hash: b0664c28dbfd12b2

### Prompt Memory

Automation: Daily Mojo AI Summits Receipt Review
Automation ID: daily-mojo-ai-summits-receipt-review
Automation memory: $CODEX_HOME/automations/daily-mojo-ai-summits-receipt-review/memory.md
Review Mojo AI Summits budget receipts for the /budget profit-and-loss workflow. Work in C:\Users\scott\Code\aix. Use the existing Cloudflare/R2 storage configuration and local credentials only as needed, without printing secrets. Confirm the /budget API ingests all receipts under receipts/ as costs, create the daily receipt review snapshot if possible, and summarize new receipts, receipts missing dollar amounts, reviewed/reimbursed totals, and any errors that need Scott's attention. Mandatory completion

[Prompt excerpt truncated by Obsidianify.]

### Assistant Outcome

You’re right. The deployed code was still letting stale invite records count as registered if they had old `usedAt/usedBy` fields, even when there was no matching guest registration row.

I fixed that locally now:
- API only marks an invite as registered when it matches an actual registration record.
- CRM page ignores old `used` invite metadata when the API says there is no registration match.
- Stale duplicate invite usage should no longer inflate 7 actual registrations into 9.

Validation passed: API syntax, registration API syntax, CRM script parse, and diff check.

This fix is not deployed yet. The next step is a deploy.
