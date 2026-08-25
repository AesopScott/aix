## 2026-08-14T11:22:57-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\14\rollout-2026-08-14T09-21-12-01a000dc-e695-7072-a1a2-fd6a0806acc0.jsonl
- Turn Id: 01a00140-bbd0-7053-a5bb-f33bbc473df8
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

Use **save-on-change**, not polling and not a separate save button.

The clean flow is:

1. When you click **Track Person**, it immediately saves that person to the server.
2. When you change their LinkedIn stage or registration-request stage, the browser immediately sends that one change to the server.
3. When you delete someone, it confirms, then deletes that server record.
4. When the CRM reloads, it pulls those saved records from the database.

No five-second watcher is needed. Polling is noisier and can cause stale updates. The browser already knows exactly when a field changes, so it should save at that moment.

One important note: in the version I just built, the new **pre-invite tracked people** save persistently. Existing invite rows still have some stage edits that were previously browser-local. The better final version is to make **all Guest Matrix stage changes** use the same persistent save-on-change model, whether the row started as a pre-invite tracked person or as an invite record.

Recommended behavior:
- Dropdowns: save immediately on change.
- Text fields or notes, if we add them later: autosave after a short debounce, maybe 750ms after typing stops, and also on blur.
- UI feedback: show `Saving...`, then `Saved`, and show an error if the save fails.

So: no save button unless you want one for psychological comfort. The practical implementation should be automatic save-on-change.
