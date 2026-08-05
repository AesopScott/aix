# Obsidianify Codex Hook Recovery

Updated: 2026-08-03

## Summary

Codex Obsidianify memory for AIX had drifted. The project packet was stale and `STATUS.json` pointed at the Claude packet from 2026-07-31 while the Codex packet was still from 2026-07-28.

## Diagnosis

- AIX vault routing was valid: `C:\Users\scott\Code\aix\obsidian\AIX`.
- The hook audit showed the last AIX Codex write before recovery was 2026-07-28.
- Codex had many AIX session logs on 2026-08-01 through 2026-08-03, so the missing memory was caused by hook/replay drift, not absent session logs.
- The active Codex `SessionStart` and `UserPromptSubmit` Obsidianify hook states were made explicitly enabled in `C:\Users\scott\.codex\config.toml`.

## Recovery Performed

- Backfilled completed August AIX Codex sessions with `omi.py replay-session`.
- Created recovered session notes under `session2026-08-03/`.
- Refreshed the Codex memory packet with `omi.py refresh-global`.
- Confirmed `STATUS.json` now points at `CODEX_SESSION_CONTEXT.md` for agent `codex`, generated 2026-08-03.

## Follow-Up

On the next new Codex task in AIX, confirm the hook audit receives fresh `record-prompt` and `record-turn` entries without manual replay.
