# CLAUDE.md

## Shortcut commands

- **"git deploy"**: Commit all pending changes and push to `origin main`. Pushing to `main` automatically triggers the `Deploy Mojo AI Summits to Cloudflare Pages` GitHub Actions workflow ([.github/workflows/deploy-cloudflare-pages.yml](.github/workflows/deploy-cloudflare-pages.yml)), which runs `wrangler pages deploy dist` and publishes to Cloudflare Pages. No separate Cloudflare deploy step is needed — the push is the deploy.
  - Steps: `git add -A`, commit with a message summarizing the change, `git push origin main`.
  - After pushing, confirm the workflow run succeeded (`gh run list --repo AesopScott/aix --limit 1`) before reporting deploy as complete.
