## 2026-07-31T13:23:31-06:00

- Agent: claude
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.claude\projects\C--Users-scott-Code-aix\5530a85a-40cb-4281-ace0-01fc20a1f57f.jsonl
- Turn Id: 10d75c80-57cb-4747-981b-863e0a642aa7
- Classification: valuable
- Information Type: Architecture
- Reason: durable implementation outcome
- Trigger Prompt Hash: 61e004cbe51d840e

### Prompt Memory

Can you give me a handoff file with your findings?

### Assistant Outcome

Written to [docs/tech/crm-contacts-handoff.md](docs/tech/crm-contacts-handoff.md) — it's untracked, so commit or delete it as you prefer.

The doc is organized so whoever picks it up can act without re-deriving anything:

- **Root cause** — the live CRM is a different app from the one this repo builds, with the three independent confirmations (401 vs 200 on the same path, divergent response headers, assets live that don't exist in the repo) and the side table comparing the two applications.
- **Verified working** — the registration write path, plus the timeline showing that no production registration has ever run against the current build.
- **Verified bugs** — `industry` dropped and event-name-as-invite-code, each with the exact `file:line`.
- **Suspected but not confirmed** — the same-key write race, rebuild-on-read scaling, and KV list consistency, all explicitly marked as unproven, including the note that I tried to reproduce the race and failed.
- **Ruled out** — the five things I checked and eliminated, so nobody re-treads them.
- **Open questions** — led by the blocking one: where the live SPA is deployed from.
- **Re-verification commands** — copy-pasteable.

Two things I'd flag before anyone acts on it. The provenance section records that another agent was committing throughout the analysis (`HEAD` moved twice, and `functions/api/contacts.js` / `stats.js` appeared mid-session), so `HEAD` should be re-checked first — commit `a90304d` suggests Codex has started building against the live SPA's `/api/contacts` contract already, which may partly overlap this work.

And the doc records what I could not confirm as clearly as what I could. The concurrent-write race in particular reads like a solid bug but I failed to reproduce it, so it's filed as a hazard rather than

[Outcome truncated by Obsidianify.]
