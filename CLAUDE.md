# CLAUDE.md

## Shortcut commands

- **"deploy"**: Commit all pending changes with a concise message summarizing the diff, `git pull --rebase origin main` to rebase on top of the latest remote changes, then push to `origin main` (no confirmation needed — this is a pre-authorized action for this alias only). If the rebase hits conflicts, stop and surface them instead of resolving automatically.
  - Pushing to `main` automatically triggers the `Deploy Mojo AI Summits to Cloudflare Pages` GitHub Actions workflow ([.github/workflows/deploy-cloudflare-pages.yml](.github/workflows/deploy-cloudflare-pages.yml)), which runs `wrangler pages deploy dist` and publishes to Cloudflare Pages. No separate Cloudflare deploy step is needed — the push is the deploy.
  - Steps: rebase locally first (`git pull --rebase origin main`), commit with a message summarizing the change, `git push origin main`.
  - After pushing, confirm the workflow run succeeded (`gh run list --repo AesopScott/aix --limit 1`) before reporting deploy as complete.

## Credentials

- All credentials/API keys for this project (Resend, AWS, Cloudflare, etc.) live in the root [.env](.env) file — check there first before asking the user for a key. `.env` is gitignored; never commit it or paste its values into commits, PRs, or Obsidian session notes.
- Production secrets are separately set on the Cloudflare Pages project (`mojo-ai-summits`) via `wrangler pages secret put` — `.env` is the source of truth to sync from, but the deployed Functions only see what's been pushed as a Pages secret. Run `npx wrangler pages secret list --project-name mojo-ai-summits` to see what's already configured (names only, not values).
