## 2026-08-23T14:10:28-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\14\rollout-2026-08-14T09-21-12-01a000dc-e695-7072-a1a2-fd6a0806acc0.jsonl
- Turn Id: 01a03019-4ead-7ab0-8d46-819427e83e9f
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

Deployed.

PR #165 merged: [Fix Guest Registration lifecycle statuses](https://github.com/AesopScott/aix/pull/165)
Production is live at [mojoaisummits.com/crm/](https://mojoaisummits.com/crm/), and I verified the deployed page includes the Guest Registration lifecycle normalizer, status filter rebuild, and dropdown save wiring.

Version bumped to `0.1.136`. Cloudflare Pages run `32661535156` succeeded.

Timing:
- Phase 1 audit: ~14s
- Phase 2 clean branch + patch: ~1m 46s
- Phase 3 validation: ~20s
- Phase 4 commit: ~15s
- Phase 5 PR + merge: ~34s
- Phase 6 Cloudflare deploy: ~43s
- Phase 7 production verification: ~6s
- Total: ~4m

::git-create-branch{cwd="C:\Users\scott\Code\aix\tmp\deploy-guest-registration-lifecycle-20260823" branch="codex/guest-registration-lifecycle-20260823"}
::git-stage{cwd="C:\Users\scott\Code\aix\tmp\deploy-guest-registration-lifecycle-20260823"}
::git-commit{cwd="C:\Users\scott\Code\aix\tmp\deploy-guest-registration-lifecycle-20260823"}
::git-push{cwd="C:\Users\scott\Code\aix\tmp\deploy-guest-registration-lifecycle-20260823" branch="codex/guest-registration-lifecycle-20260823"}
::git-create-pr{cwd="C:\Users\scott\Code\aix\tmp\deploy-guest-registration-lifecycle-20260823" branch="codex/guest-registration-lifecycle-20260823" url="https://github.com/AesopScott/aix/pull/165" isDraft=false}
## 2026-08-23T14:14:30-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\14\rollout-2026-08-14T09-21-12-01a000dc-e695-7072-a1a2-fd6a0806acc0.jsonl
- Turn Id: 01a0303e-3ad8-7091-bbc2-998e33565794
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

The registered people are there; the Guest Matrix is misclassifying them.

What’s happening:

1. Public guest registrations are saved as real Guest Registration records, but the saved registration starts with `crmStatus: "new"` in [functions/_registration-crm.js](C:/Users/scott/Code/aix/functions/_registration-crm.js:1282).

2. The Guest Matrix does **not** read the Guest Registration rows directly. It builds from invite links plus manually tracked matrix prospects in [dist/crm/index.html](C:/Users/scott/Code/aix/dist/crm/index.html:3791).

3. The API does try to enrich invite links by matching registrations, but it only copies fields like `usedByName`, `usedByEmail`, event/show info. It does **not** promote the invite’s `crmStatus` / `registrationStatus` to `registered` in [functions/api/crm.js](C:/Users/scott/Code/aix/functions/api/crm.js:4047).

4. Then the Guest Matrix UI checks `crmStatus` / `registrationStatus` first. If the invite still says `invited`, it returns `invited` before the later “does this have usedByName/usedByEmail?” registered check can win in [dist/crm/index.html](C:/Users/scott/Code/aix/dist/crm/index.html:3402).

So the matrix is seeing “this invite has a registered person attached,” but the status field still says “invited,” and the status field wins.

The fix is to make registration evidence win: when an invite has a matched registration or `usedBy*` fields, the API/UI should force the matrix lifecycle to `registered` before considering `invited`.
## 2026-08-23T14:17:18-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\14\rollout-2026-08-14T09-21-12-01a000dc-e695-7072-a1a2-fd6a0806acc0.jsonl
- Turn Id: 01a03040-f701-7712-b962-156e3e3742bc
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

Fixed locally.

I kept the lifecycle meaning straight:

`Invited` = registration form/link has been sent.
`Registered` = they actually completed registration or the invite has used/matched registration evidence.

Changes made:
- New completed guest registrations now save as `registered`, not `new`.
- Invite-link enrichment now marks matched/used registrations as `registered` for the matrix.
- Guest Matrix UI now lets completed-registration evidence override earlier statuses like `Invited`, but not later statuses like `Attended`, `No Show`, `Declined`, or `Bad Fit`.

Validation passed:
- CRM page script parse
- CRM API syntax check
- Registration API syntax check
- Diff whitespace check

Not deployed yet.
## 2026-08-23T18:39:59-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\14\rollout-2026-08-14T09-21-12-01a000dc-e695-7072-a1a2-fd6a0806acc0.jsonl
- Turn Id: 01a0306f-f3b4-7aa2-82b8-7150564c06fe
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

Deployed the Guest Matrix registration-count fix.

The live build now only treats someone as `Registered` when there is an actual matching guest registration record, not just stale invite metadata. That should stop the matrix from inflating the registered count from 7 to 9.

Version: `0.1.143`
PR: [#172](https://github.com/AesopScott/aix/pull/172)
Merge commit: `e8452e8`
Cloudflare Pages deployment: [6445a644.mojo-ai-summits.pages.dev](https://6445a644.mojo-ai-summits.pages.dev)
GitHub Action: success, `Deploy to Cloudflare Pages` completed in 21s.

I also verified the production CRM page is serving the new frontend markers. I could not query the authenticated CRM API data directly from the shell because `/api/crm` correctly requires Mojo allowlist sign-in.

Timing: prep/repo/branch/patch/version/validation/commit/PR/merge took about `2:50`; Cloudflare deploy took `0:32`; production verification brought the total to about `4:05`.

::git-create-branch{cwd="C:\Users\scott\Code\aix\tmp\deploy-guest-matrix-actual-registrations-20260823-work" branch="codex/guest-matrix-actual-registrations-20260823"}
::git-stage{cwd="C:\Users\scott\Code\aix\tmp\deploy-guest-matrix-actual-registrations-20260823-work"}
::git-commit{cwd="C:\Users\scott\Code\aix\tmp\deploy-guest-matrix-actual-registrations-20260823-work"}
::git-push{cwd="C:\Users\scott\Code\aix\tmp\deploy-guest-matrix-actual-registrations-20260823-work" branch="codex/guest-matrix-actual-registrations-20260823"}
::git-create-pr{cwd="C:\Users\scott\Code\aix\tmp\deploy-guest-matrix-actual-registrations-20260823-work" branch="codex/guest-matrix-actual-registrations-20260823" url="https://github.com/AesopScott/aix/pull/172" isDraft=false}
