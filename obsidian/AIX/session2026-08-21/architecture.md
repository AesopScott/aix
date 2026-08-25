## 2026-08-21T05:34:29-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\21\rollout-2026-08-21T01-37-05-01a02340-83e0-77d2-a33c-bbe08c1cbee8.jsonl
- Turn Id: 01a02340-8d5c-7bb0-911a-869be752ccf7
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

Receipt review completed and verified:

- 0 new receipts
- 3 receipts ingested as costs totaling $391.82
- 1 missing amount: Robert’s dinner receipt
- Reviewed/reimbursed: $0.00 / $0.00
- Scott reimbursement outstanding: $391.82
- Daily R2 snapshot and ledger hashes verified
- Archival action timed out; manually archive if task remains active

::inbox-item{title="Receipt review verified; archival stalled" summary="Enter Robert’s amount, reimburse $391.82, and archive task"}
## 2026-08-21T07:29:29-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\12\rollout-2026-08-12T17-17-22-019ff844-2279-7d03-8399-9c9df429bac5.jsonl
- Turn Id: 01a02168-582e-76b1-adf4-002489257497
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

Done: I switched the target to `Mojo Accounts`.

Current state:
- `Mojo Accounts` visibly shows `71` account entries in Sales Navigator.
- I opened the executive people search filtered to:
  - `Mojo Accounts`
  - CEO, COO, CIO, CFO, CISO, CTO, Chief AI Officer
  - excluding `All my saved leads`
- That search is open and shows `3K+ results`.
- I did not add people to any lead list.

Caveat: Sales Nav would not let me toggle “Save search” on; it stayed `Off` even after direct checkbox attempts. I left the filtered search tab open as the handoff.

Also: Intel was the one account that would not verify/add cleanly in the last pass.
## 2026-08-21T07:32:05-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\12\rollout-2026-08-12T17-17-22-019ff844-2279-7d03-8399-9c9df429bac5.jsonl
- Turn Id: 01a0247c-a1e6-7d91-be9b-1bb97af92fb6
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

You were right: dropping the duplicate as “already known” loses important source truth.

I changed it so duplicates stay as one company record, but every new sighting appends source history:

- `discoverySources` and `sourceUrls` now merge for discovery/import paths.
- New structured `sourceAttributions` records capture source name, source URL, candidate page URL, evidence type, event/source category, capture time, etc.
- Vendor Universe now has a `Discovery Source` filter, so you can choose something like Black Hat and see every company sourced from Black Hat, even if the same company was also found elsewhere.
- Cards now show source pills, so the source history is visible right on the company.

Updated:
- [functions/api/crm.js](C:/Users/scott/Code/aix/functions/api/crm.js)
- [dist/crm/index.html](C:/Users/scott/Code/aix/dist/crm/index.html)
- [Partner Prospecting Engine.md](C:/Users/scott/Code/aix/obsidian/AIX/Partner%20Prospecting%20Engine.md)

Verified:
- `node --check functions/api/crm.js`
- Parsed the CRM inline browser script successfully.

I did not deploy it yet because you did not say deploy in this turn.
## 2026-08-21T07:40:26-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\12\rollout-2026-08-12T17-17-22-019ff844-2279-7d03-8399-9c9df429bac5.jsonl
- Turn Id: 01a02483-26d8-7d23-ad1f-af6ec8402401
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

Done.

In Vendor Universe, the `Discovery Source` dropdown now includes runnable source definitions, not just sources already attached to companies. So you can pick something like `Black Hat USA Sponsor Crawl`, then click `Run This Source`.

That run will only process that one source, refresh the Vendor Universe data, and keep the view filtered to that source afterward. If it finds companies that already exist, they get tagged with that source instead of duplicated.

Verified:
- CRM inline script parses cleanly.
- `functions/api/crm.js` passes `node --check`.

Not deployed yet.
## 2026-08-21T07:43:22-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\12\rollout-2026-08-12T17-17-22-019ff844-2279-7d03-8399-9c9df429bac5.jsonl
- Turn Id: 01a02486-c809-7631-9a49-926bba0c30b3
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

Production is serving the new CRM source workflow now:
- [PR #158](https://github.com/AesopScott/aix/pull/158) merged into `main`
- Merge commit: `7d78b36`
- Product version: `0.1.130`
- Production verified at [https://mojoaisummits.com/crm/](https://mojoaisummits.com/crm/)
- Confirmed live HTML includes `Run This Source`, `Source filter`, and `sourceAttributions`

GitHub Actions deployment succeeded. Active deploy step was `Deploy to Cloudflare Pages`, and it took about 25 seconds. No workflow step exceeded 2 minutes.

Timing breakdown:
- Inspect/version/deploy scope: ~1:15
- Validate, version bump, stage, commit: ~2:50
- Rebase/conflict resolution/local stash handling: ~7:30
- Push, PR, checks, merge: ~2:00
- Cloudflare deploy and production verification: ~1:55
- Total: ~15:30

One note: the pre-existing unrelated dirty worktree changes are preserved in stashes because restoring them after the rebase caused unrelated conflicts. They are not part of the deploy:
- `stash@{0}` untracked rebase blockers
- `stash@{1}` unrelated tracked changes

::git-stage{cwd="C:\Users\scott\Code\aix"}
::git-commit{cwd="C:\Users\scott\Code\aix"}
::git-push{cwd="C:\Users\scott\Code\aix" branch="codex/setup-status-colors-20260813"}
::git-create-pr{cwd="C:\Users\scott\Code\aix" branch="codex/setup-status-colors-20260813" url="https://github.com/AesopScott/aix/pull/158" isDraft=false}
## 2026-08-21T08:02:54-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\07\27\rollout-2026-07-27T15-30-48-019fa57c-d29c-7640-966e-186ec74b43a9.jsonl
- Turn Id: 01a02153-e232-7fb2-9680-fe11cea8c273
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

I updated the CRM partner invite flow in:

- [dist/crm/index.html](C:/Users/scott/Code/aix/dist/crm/index.html:1565)
- [functions/api/crm.js](C:/Users/scott/Code/aix/functions/api/crm.js:178)

What changed:
- CRM nav now says `Partner Invite Links`, not `Guest Partner Invite Links`.
- Partner invite form now has `Generate Link` and `Generate Link + Send Email`.
- The send-email button generates the partner invite link and emails it to the listed partner email.
- Partner invite email copies `scott@mojoaisummits.com`, `miller@mojoaisummits.com`, and `jodi@mojoaisummits.com`.
- Angel is not on the partner invite CC list.
- I added a small compatibility alias so the old internal `guest-partner-invite-links` view still redirects to the new partner invite view if anything has it bookmarked.

Verification passed:
- `node --check functions/api/crm.js`
- CRM inline script syntax check

Not deployed yet.
## 2026-08-21T08:06:50-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\07\27\rollout-2026-07-27T15-30-48-019fa57c-d29c-7640-966e-186ec74b43a9.jsonl
- Turn Id: 01a024a0-891e-7141-bc7f-4bdcfcb53b90
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

Fixed. There is no title permission flag anymore in the virtual event guest payload or page renderer.

Changed:
- [functions/api/virtual-events/[slug].js](C:/Users/scott/Code/aix/functions/api/virtual-events/[slug].js): title now always passes through when present; only name and company are permission-gated.
- [dist/ai-executive-readiness-online/index.html](C:/Users/scott/Code/aix/dist/ai-executive-readiness-online/index.html): removed `Title withheld`; fallback is now only `Title pending`.

Verification passed:
- `node --check functions/api/virtual-events/[slug].js`
- event page inline script syntax check
- no remaining `Title withheld` / fake title-permission references in those files.

Not deployed yet.
## 2026-08-21T08:09:27-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\13\rollout-2026-08-13T09-18-20-019ffbb3-ea7b-7481-b0e4-e36c8481017c.jsonl
- Turn Id: 01a0213f-1d9b-7441-9112-78dcbc200dc6
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

Done. I turned the upload into a polished partner-page video with the dark suit and Mojo-style navy/cyan studio background.

Preview video:
![Partner page video](C:/Users/scott/Downloads/mojo-ai-summits-partner-page-video-20260820-1p2x.mp4)

I also added it to the local partner page hero above the proof stats:
[http://127.0.0.1:8787/partners/](http://127.0.0.1:8787/partners/)

Updated local site files:
- [dist/partners/index.html](C:/Users/scott/Code/aix/dist/partners/index.html)
- [partner video MP4](C:/Users/scott/Code/aix/dist/assets/video/mojo-ai-summits-partner-page-video.mp4)
- [partner video poster](C:/Users/scott/Code/aix/dist/assets/video/mojo-ai-summits-partner-page-video-poster.jpg)

Verified: 34s duration, audio present, controls on the page, video/poster serving locally, no 2-second frozen sections detected.

Used built-in imagegen with an identity-preserve prompt: keep his face, glasses, beard, and camera line; replace the polo/home office with a dark tailored suit and Mojo navy/cyan executive studio. Not deployed yet.
## 2026-08-21T08:15:39-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\07\27\rollout-2026-07-27T15-30-48-019fa57c-d29c-7640-966e-186ec74b43a9.jsonl
- Turn Id: 01a024a2-5473-7be1-a092-47e0bd876b60
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

Live verification passed:
- [AI Executive Readiness](https://mojoaisummits.com/ai-executive-readiness-online/) returns `200`
- No `Title withheld`
- No fake `titleAllowed` field
- API verified at `/api/virtual-events/ai-executive-readiness`

PR #159 was merged to `main`, and the Cloudflare Pages workflow completed successfully.

Timing:
- Inspect/setup: 0:45
- Fresh branch from `origin/main`: 1:20
- Version/checks/staging: 1:55
- Commit/push: 0:25
- PR/merge: 1:30
- Production deploy/verify: 1:55
- Total: 7:50

::git-create-branch{cwd="C:\Users\scott\Code\aix" branch="codex/virtual-title-permissions-20260821"}
::git-stage{cwd="C:\Users\scott\Code\aix"}
::git-commit{cwd="C:\Users\scott\Code\aix"}
::git-push{cwd="C:\Users\scott\Code\aix" branch="codex/virtual-title-permissions-20260821"}
::git-create-pr{cwd="C:\Users\scott\Code\aix" branch="codex/virtual-title-permissions-20260821" url="https://github.com/AesopScott/aix/pull/159" isDraft=false}
## 2026-08-21T08:16:04-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\13\rollout-2026-08-13T09-18-20-019ffbb3-ea7b-7481-b0e4-e36c8481017c.jsonl
- Turn Id: 01a024a3-ff29-76a0-9241-f6867f19643c
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

Fixed. I rebuilt the partner page video with the burned-in Mojo logo, company name, and:

Miller Freeman
Director of Partnerships

New branded master:
![Miller Freeman partner video](C:/Users/scott/Downloads/mojo-ai-summits-partner-page-video-20260820-branded-1p2x.mp4)

Updated the local website video and poster, and restored the partner-page hero embed:
[http://127.0.0.1:8787/partners/](http://127.0.0.1:8787/partners/)

Verified locally:
- Partner page serves
- Video and poster serve
- Controls are present
- Audio is present
- Duration is about 34 seconds

Not deployed yet.
## 2026-08-21T08:24:47-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\18\rollout-2026-08-18T09-17-43-01a01573-280c-7c02-9c13-5c52c6dd3f67.jsonl
- Turn Id: 01a024ad-9a1b-7ed0-8eb1-ad00836ad4d4
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

Yes, you were right to push on this. I fixed two things locally:

1. **Member registration now requires a brief/bio photo**
   - Added the required file upload to [dist/member-registration/index.html](C:/Users/scott/Code/aix/dist/member-registration/index.html:515)
   - Member registration now submits multipart form data instead of JSON so the image actually reaches the backend: [dist/member-registration/index.html](C:/Users/scott/Code/aix/dist/member-registration/index.html:877)

2. **Guest photos were likely being stored but not shown in CRM**
   - The backend was storing guest/partner photo fields, but the CRM API normalization was dropping `photoUrl`/`photoKey` when reading registrations back.
   - Fixed that in [functions/api/crm.js](C:/Users/scott/Code/aix/functions/api/crm.js:1513)
   - CRM registrant rows now show either a **Brief photo** link or a **Missing photo** warning: [dist/crm/index.html](C:/Users/scott/Code/aix/dist/crm/index.html:5707)

I also changed the shared registration handler so **guest, member, and partner** all require/store photos through the same path: [functions/_registration-crm.js](C:/Users/scott/Code/aix/functions/_registration-crm.js:450).

Validation passed:
- `node --check functions/_registration-crm.js`
- `node --check functions/api/crm.js`
- Parsed scripts in guest/member/partner/CRM HTML
- `node scripts/check-website-analytics-privacy.mjs`

This is not deployed yet. The important bit: after deploy, existing guest records that already have uploaded photo metadata should start showing photo links in CRM; records that truly never uploaded a photo will show **Missing photo**.
## 2026-08-21T08:37:38-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\21\rollout-2026-08-21T08-32-01-01a024bc-651e-7062-9fbf-e853d1a69c5d.jsonl
- Turn Id: 01a024bc-68c5-7210-8969-68cdb992601e
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

Built the reusable campaign scaffold here:

[mojo-linkedin-thesis-image-series.md](C:/Users/scott/Code/aix/docs/marketing/mojo-linkedin-thesis-image-series.md:1)

I also added the durable Obsidian handoff note:

[Mojo LinkedIn Thesis Image Series.md](<C:/Users/scott/Code/aix/obsidian/AIX/Mojo LinkedIn Thesis Image Series.md:1>)

The plan turns the reference style into a Mojo version: bold “thesis poster” images tied to each upcoming virtual event, with a contemporary AI hook, guest/contributor slot, headline, caption opener, production prompt template, brand rules, and consent checklist. I grounded the hooks in current sources: [Gartner on agent governance](https://www.gartner.com/en/newsroom/press-releases/2026-05-26-gartner-says-applying-uniform-governance-across-ai-agents-will-lead-to-enterprise-ai-agent-failure), [EU AI Act enforcement](https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai), [IBM 2026 breach economics](https://newsroom.ibm.com/2026-07-29-ibm-study-one-in-four-malicious-breaches-are-ai-enabled%2C-costing-companies-6-million-on-average), and [NIST GenAI risk profile](https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence).

I didn’t generate the actual image assets yet because the guest names, companies, titles, and portraits should be approved first. Next input needed: the first event plus the approved guest roster/photo permissions.
## 2026-08-21T08:41:12-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\21\rollout-2026-08-21T08-32-01-01a024bc-651e-7062-9fbf-e853d1a69c5d.jsonl
- Turn Id: 01a024bf-5708-7ed3-9f1b-7f2a7a68ff97
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

Yes, exactly. Treat those Scott images as **identity and pose references**, then render him as a main character inside the scene instead of dropping him in as a small headshot.

I made a first proof-of-concept using the suited Scott references:

![AI Readiness Scott Proof](C:/Users/scott/Code/aix/output/linkedin-image-series/ai-readiness-is-not-a-vibe-scott-proof.png)

Saved here: [ai-readiness-is-not-a-vibe-scott-proof.png](C:/Users/scott/Code/aix/output/linkedin-image-series/ai-readiness-is-not-a-vibe-scott-proof.png)

The key production rule is: Scott should occupy roughly 35-45% of the frame, with the scene lighting wrapping around him. For final posts, I’d use the suited versions for executive/event authority pieces, and the sunglasses versions for sharper founder-opinion posts where the tone can be more provocative. For the most polished output, we can generate the rendered scene with minimal text, then overlay the exact Mojo logo/headline/CTA ourselves so the typography is always perfect.
## 2026-08-21T08:41:53-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\21\rollout-2026-08-21T08-32-01-01a024bc-651e-7062-9fbf-e853d1a69c5d.jsonl
- Turn Id: 01a024c3-b831-7673-a146-de1f714c9cca
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

I found the publishable registered/featured names for **AI Executive Readiness** and excluded the records marked name-restricted.

**LinkedIn Post Draft**

AI readiness is not a vibe. It is a governance problem with a calendar invite.

Yesterday, Gartner said CFOs should treat their first finance AI agent as a **governance pilot before scaling**, because the real risk is not whether agents can act. It is whether leaders can trace, review, and own what those agents do.

That is exactly why we are bringing executives together for **Mojo AI Summits: AI Executive Readiness** on **Friday, September 4, 2026**.

Registered and featured participants include **Cynthia Dixon**, **Jess J Montgomery**, **Mathew Schroeder**, **Dan Sinawat**, and **Jessica Montgomery**.

We will be looking at the leadership baseline: adoption, value, operating ownership, data readiness, and risk.

Because the next AI question is not “What tool should we buy?”

It is: **Who owns the decision when AI starts acting inside the business?**

Request your executive invitation: https://mojoaisummits.com/virtual/

Source hook: [Gartner, August 20, 2026](https://www.gartner.com/en/newsroom/new/pr-q-a-new-vis-template/2026-08-20-gartner-says-cfos-mus-pilot-governance-first-before-scaling-ai-agents)
## 2026-08-21T08:51:57-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\21\rollout-2026-08-21T08-32-01-01a024bc-651e-7062-9fbf-e853d1a69c5d.jsonl
- Turn Id: 01a024c8-f6fd-7d63-8a22-abd042851cc8
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

Done. I added the official Mojo badge to the upper-left, using the brand guide rules: approved artwork, no recolor/stretch, AI uppercase, deep navy/cyan/blue palette, and clear space.

![Chinese AI Models Mojo Post](C:/Users/scott/Code/aix/output/linkedin-image-series/chinese-ai-models-scott-realistic-logo.png)

Files:
[Final image](C:/Users/scott/Code/aix/output/linkedin-image-series/chinese-ai-models-scott-realistic-logo.png)
[Full package doc](C:/Users/scott/Code/aix/output/linkedin-image-series/chinese-ai-models-package.md)

**Post Verbiage**
Chinese AI models are no longer a side story.

In the last few days, the signal got harder to ignore: China’s AI ecosystem is pushing serious pressure into the global model race, while Alibaba keeps pouring capital into AI and cloud infrastructure even as near-term profits take the hit.

That raises a real executive-readiness question:

If lower-cost, fast-improving, globally available AI models from companies like DeepSeek, Qwen, Kimi, Moonshot, and others keep gaining traction, how should leaders think about model strategy, procurement, governance, data exposure, vendor dependency, and geopolitical risk?

That is the kind of question we are bringing into **Mojo AI Summits: AI Executive Readiness** on **Friday, September 4, 2026**.

**Executive input provided by Cynthia Dixon, Jess J Montgomery, Mathew Schroeder, and Dan Sinawat.**

The issue is not just whether Chinese AI models are “good enough.”

It is whether executive teams are ready for a world where AI advantage may come from open models, cheaper inference, faster iteration, and a very different global model ecosystem.

**Do you agree? Disagree? Is this real?**

https://mojoaisummits.com/virtual/

I deduped the Jess/Jessica Montgomery registration wording so it reads

[Outcome truncated by Obsidianify.]
## 2026-08-21T08:52:48-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\21\rollout-2026-08-21T08-32-01-01a024bc-651e-7062-9fbf-e853d1a69c5d.jsonl
- Turn Id: 01a024cc-faa4-7381-b41e-0e40cf7494dd
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

You were right. I fixed the logo overlay so the square black background is gone and only the circular Mojo badge appears.

![Corrected Chinese AI Models Mojo Post](C:/Users/scott/Code/aix/output/linkedin-image-series/chinese-ai-models-scott-realistic-logo-transparent.png)

Updated files:
[Corrected final image](C:/Users/scott/Code/aix/output/linkedin-image-series/chinese-ai-models-scott-realistic-logo-transparent.png)
[Updated package doc](C:/Users/scott/Code/aix/output/linkedin-image-series/chinese-ai-models-package.md)

I also verified the transparent logo file has alpha at the corners, so the black square should not show anymore.
## 2026-08-21T08:55:49-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\21\rollout-2026-08-21T08-32-01-01a024bc-651e-7062-9fbf-e853d1a69c5d.jsonl
- Turn Id: 01a024ce-a89d-7ad1-b1dc-a6dbe187543e
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

Fixed. The package now points to the actual event URL:

https://mojoaisummits.com/virtual/ai-executive-readiness

Updated here: [chinese-ai-models-package.md](C:/Users/scott/Code/aix/output/linkedin-image-series/chinese-ai-models-package.md)

I verified that event route returns `200`.
## 2026-08-21T08:58:53-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\14\rollout-2026-08-14T09-21-12-01a000dc-e695-7072-a1a2-fd6a0806acc0.jsonl
- Turn Id: 01a0217d-8296-7400-9b4d-616e7ad026eb
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

PR #157 was merged into `main`: [Fix partner registration link lifecycle rows](https://github.com/AesopScott/aix/pull/157)

Production verification passed on [mojoaisummits.com/crm](https://mojoaisummits.com/crm/):
- Partner Registration now requests `registrationLinks=1`
- Unused partner registration links can save lifecycle status
- Manual partner contacts without links stay out of Partner Registration

GitHub Actions deployment succeeded: run `32428663048`, merge commit `19cccfa`.

Timing breakdown, total about `1:09`:
- Repo audit: `0:03`
- Clean release branch: `0:04`
- Copy fix + version bump: `0:03`
- Validation: `0:04`
- Stage/commit: `0:03`
- Push + PR: `0:07`
- Merge: `0:07`
- GitHub Actions deploy: `0:34`
- Production verification: `0:04`

Version deployed: `0.1.129`.

::git-create-branch{cwd="C:\Users\scott\Code\aix\tmp\deploy-partner-registration-links-20260820" branch="codex/partner-registration-link-lifecycle-20260820"}
::git-stage{cwd="C:\Users\scott\Code\aix\tmp\deploy-partner-registration-links-20260820"}
::git-commit{cwd="C:\Users\scott\Code\aix\tmp\deploy-partner-registration-links-20260820"}
::git-push{cwd="C:\Users\scott\Code\aix\tmp\deploy-partner-registration-links-20260820" branch="codex/partner-registration-link-lifecycle-20260820"}
::git-create-pr{cwd="C:\Users\scott\Code\aix\tmp\deploy-partner-registration-links-20260820" branch="codex/partner-registration-link-lifecycle-20260820" url="https://github.com/AesopScott/aix/pull/157" isDraft=false}
## 2026-08-21T08:59:03-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\14\rollout-2026-08-14T09-21-12-01a000dc-e695-7072-a1a2-fd6a0806acc0.jsonl
- Turn Id: 01a024d3-1dea-7143-a46e-303a3cd3a468
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

Fixed the Guest Matrix filtering behavior in [dist/crm/index.html](C:/Users/scott/Code/aix/dist/crm/index.html).

What changed:
- Event grouping now uses the actual event only, so `AI Executive Readiness` should show as one event group instead of separate morning/afternoon/both groups.
- Added real matrix filters for `Show time` and `Role`.
- Existing `Event`, `Status`, and `Search` filters now work together with those new filters.
- Each row now shows its show time under the role so you can see what the show filter is acting on.

Validation passed:
- CRM page script parse check
- `git diff --check`

Not deployed yet.
## 2026-08-21T11:26:50-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\07\27\rollout-2026-07-27T15-30-48-019fa57c-d29c-7640-966e-186ec74b43a9.jsonl
- Turn Id: 01a024ac-463f-7642-b766-a6e9822b7bd7
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

The virtual event page no longer treats name permission as a display gate. Names and titles now show when present; company still respects the company permission flag. If company is restricted, the registered guest row shows `Name`, `Title`, and `Industry`.

I also removed the leftover fake page concepts:
- no `Name withheld`
- no `nameAllowed`
- no `Title withheld`
- no `titleAllowed`

Checks passed:
- `node --check functions/api/virtual-events/[slug].js`
- event page inline script syntax check

Not deployed yet.
## 2026-08-21T11:31:58-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\18\rollout-2026-08-18T09-17-43-01a01573-280c-7c02-9c13-5c52c6dd3f67.jsonl
- Turn Id: 01a024b1-b8f7-72e3-90b8-f21847581ee1
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

Yep, you were right. I adjusted it so **ordinary guests do not need a photo**.

What’s now true locally:

- Brief photo is required only for featured-style roles: featured guest, featured member, featured partner, presenter, or round table leader.
- Guest/member/partner forms hide the photo field unless the invite role needs it.
- Backend enforces the same role-aware rule, so ordinary guest registrations won’t be blocked.
- CRM only shows **Missing photo** for registrants whose role actually needs one.
- The virtual event page already pulls `photoUrl` for the featured guest cards; ordinary registered guests remain text-only, which matches your clarification.

Key refs:
- Server rule: [functions/_registration-crm.js](C:/Users/scott/Code/aix/functions/_registration-crm.js:456)
- Guest form conditional photo: [dist/guest/index.html](C:/Users/scott/Code/aix/dist/guest/index.html:636)
- Member form conditional photo: [dist/member-registration/index.html](C:/Users/scott/Code/aix/dist/member-registration/index.html:637)
- CRM role-aware missing-photo warning: [dist/crm/index.html](C:/Users/scott/Code/aix/dist/crm/index.html:5719)
- Virtual featured guest photo pull: [functions/api/virtual-events/[slug].js](C:/Users/scott/Code/aix/functions/api/virtual-events/[slug].js:112)

Validation passed: Worker syntax checks, page script parsing, and the website analytics/privacy launch gate. Not deployed yet.
## 2026-08-21T12:30:42-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\18\rollout-2026-08-18T09-17-43-01a01573-280c-7c02-9c13-5c52c6dd3f67.jsonl
- Turn Id: 01a0258d-8387-7402-b4ab-b675e79ca72f
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

Done. I added `Featured Author` as a registration/link role end to end.

Key places updated:

- CRM role dropdowns and filters in [dist/crm/index.html](C:/Users/scott/Code/aix/dist/crm/index.html:1854)
- CRM API role normalization/invite creation in [functions/api/crm.js](C:/Users/scott/Code/aix/functions/api/crm.js:1410)
- Public registration validation/photo/show handling in [functions/_registration-crm.js](C:/Users/scott/Code/aix/functions/_registration-crm.js:181)
- Guest/member/partner registration pages now treat `featured-author` as photo-required and single-show-required
- Virtual event API now treats featured authors as featured registrants in [functions/api/virtual-events/[slug].js](C:/Users/scott/Code/aix/functions/api/virtual-events/[slug].js:104)
- Docs updated to include featured authors in the featured-photo role list

Validation passed:

- `node --check` on the edited Worker files
- Parsed script blocks in CRM, guest, member, and partner registration pages
- `node scripts/check-website-analytics-privacy.mjs`
- `git diff --check`

I did not deploy this yet. The repo already has a lot of pre-existing dirty/untracked files, so I kept the work scoped and left those alone.
## 2026-08-21T12:34:22-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\18\rollout-2026-08-18T09-17-43-01a01573-280c-7c02-9c13-5c52c6dd3f67.jsonl
- Turn Id: 01a02593-e21a-7bd3-a648-af48dd741fa1
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

Fixed the workflow gap.

Guest/member invite rows in CRM now have an inline `Show time` selector plus `Save Time`, so an unused invite like Imran’s can be changed from the 1:00 pm afternoon show to the 10:00 am morning show before he registers.

Changed:

- [dist/crm/index.html](C:/Users/scott/Code/aix/dist/crm/index.html:4225): adds the editable show-time control in Guest Invites
- [dist/crm/index.html](C:/Users/scott/Code/aix/dist/crm/index.html:6711): posts the show-time update and refreshes invite/matrix lists
- [functions/api/crm.js](C:/Users/scott/Code/aix/functions/api/crm.js:4469): updates the stored invite record
- [functions/api/crm.js](C:/Users/scott/Code/aix/functions/api/crm.js:6597): adds the API action `update-registration-invite-show`

I made used/registered invite rows read-only there, since after registration the event details live on the registrant record.

Validation passed: `node --check`, CRM script parse, analytics/privacy gate, and `git diff --check`.

Not deployed yet.
## 2026-08-21T12:41:18-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\18\rollout-2026-08-18T09-17-43-01a01573-280c-7c02-9c13-5c52c6dd3f67.jsonl
- Turn Id: 01a02596-eb38-7341-bf19-83e3939a9ae2
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

Deployed and live.

Version: `0.1.135`
PR: [#164](https://github.com/AesopScott/aix/pull/164)
Merge commit: `6be7857`
Cloudflare Pages workflow: [successful run](https://github.com/AesopScott/aix/actions/runs/32513900364)

Included:

- `Featured Author` registration and invite-link option
- Featured-author photo and single-show behavior
- Editable show time for unused Guest Invites, so Imran-style corrections can be made before registration

Production smoke checks passed for CRM, guest/member/partner registration pages, and the virtual-event API. The Cloudflare deploy step took about 21 seconds; no workflow step exceeded 2 minutes.

Timing total: `00:03:05`

- Inspect repo/version: `00:00:08`
- Fetch/worktree/version bump: `00:00:09`
- Apply scoped patch: `00:00:07`
- Validation: `00:00:06`
- Stage/commit/version correction: `00:00:32`
- Push: `00:00:06`
- PR create: `00:00:05`
- PR status: `00:00:04`
- Merge PR: `00:00:06`
- Actions + branch cleanup: `00:00:52`
- Production smoke/final verification: `00:00:50`

::git-create-branch{cwd="C:/Users/scott/Code/aix/tmp/deploy-author-invite-show-20260821-1231" branch="codex/author-invite-show-20260821"}
::git-stage{cwd="C:/Users/scott/Code/aix/tmp/deploy-author-invite-show-20260821-1231"}
::git-commit{cwd="C:/Users/scott/Code/aix/tmp/deploy-author-invite-show-20260821-1231"}
::git-push{cwd="C:/Users/scott/Code/aix/tmp/deploy-author-invite-show-20260821-1231" branch="codex/author-invite-show-20260821"}
::git-create-pr{cwd="C:/Users/scott/Code/aix/tmp/deploy-author-invite-show-20260821-1231" branch="codex/author-invite-show-20260821" url="https://github.com/AesopScott/aix/pull/164" isDraft=false}
## 2026-08-21T12:50:53-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\18\rollout-2026-08-18T09-17-43-01a01573-280c-7c02-9c13-5c52c6dd3f67.jsonl
- Turn Id: 01a025a0-88bd-7930-afc7-7ce5589faf36
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

Same link is fine.

The invite link is code-based, so when you edit the show time on that invite record, the existing URL still points to the same invite code. When he opens it, the registration page validates the code and pulls the updated invite metadata, so it should show/use the corrected `10:00 am - 11:30 am CT` registration automatically.

He would only need a new link if you deleted the original invite and generated a replacement.
## 2026-08-21T20:30:19-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\21\rollout-2026-08-21T19-38-28-01a0271e-8a16-73c1-b89a-b1e6bad8a3e5.jsonl
- Turn Id: 01a0271e-939c-7c00-af1e-9d078ee00cf1
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

Receipt review completed and verified:

- 0 new receipts; 3 R2 objects match 3 ledger rows.
- Active costs: $391.82.
- Reviewed/reimbursed: 0 / $0.00.
- Robert’s receipt is missing its dollar amount.
- Scott has 2 unreimbursed receipts totaling $391.82.
- `budget/reviews/2026-08-22.json` and the ledger passed readback hash verification.
- Task archival timed out; manually archive it if still active.

::inbox-item{title="Receipt review verified; archive timed out" summary="Enter Robert’s amount, review three receipts, reimburse Scott $391.82"}
