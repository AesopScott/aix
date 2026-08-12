## 2026-08-12T10:14:31-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\07\27\rollout-2026-07-27T07-32-59-019fa3c7-5c79-7b12-896f-863c8abc0ea2.jsonl
- Turn Id: 019ff6b6-3d14-72b3-8808-f560253b914d
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

Yes for the actual guest registration email-sending paths I found in `origin/main`.

The backend defines:

`guestInviteEmailCc = ["angel@mojoaisummits.com", "scott@mojoaisummits.com"]`

That CC list is used when:

1. You generate a guest invite and click `Send Email`.
2. You send a guest invite reminder email.

Both routes go through the same Resend helper, which includes the `cc` field on the outgoing email.

One important nuance: I did not find a separate Contacts-page email-sending action. The Contacts “Send Invitation” item appears to be a CRM next-action/status value, not an email sender by itself. So if Contacts is supposed to have its own “send guest registration email” button, that may still need to be wired. I did not send any test emails.
## 2026-08-12T10:23:59-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\07\27\rollout-2026-07-27T07-32-59-019fa3c7-5c79-7b12-896f-863c8abc0ea2.jsonl
- Turn Id: 019ff6c7-2442-7351-a6d6-39fda3d99078
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

No, not in the **Contacts contact info** right now.

The CRM does store those consent fields on the raw registrant records: `publicationUseName` and `publicationUseCompany` are normalized in [functions/api/crm.js](C:/Users/scott/Code/aix/functions/api/crm.js:386), and the registrant CSV export includes them.

But when registrants are merged into **Contacts**, the contact object only carries a `publicationCount`, not the specific “Name allowed” / “Company allowed” flags. In the Contacts table, the “Publication” column shows only a count, via `publicationBadges()` in [dist/crm/index.html](C:/Users/scott/Code/aix/dist/crm/index.html:1921).

So: **Guest Registrants can show Name/Company publication opt-ins, but Contacts currently does not show those two permissions in the contact info.**
