# MojoAISummits.com Deployment Process

## Purpose

This document defines the deployment process for `mojoaisummits.com`, which is served from the `AesopScott/aix` GitHub repository through Cloudflare Pages.

## Production Shape

- Domain: `mojoaisummits.com`
- GitHub repository: `AesopScott/aix`
- Primary branch: `main`
- Cloudflare Pages project: `mojo-ai-summits`
- Published directory: `dist`
- Pages Functions directory: `functions`
- Cloudflare configuration file: `wrangler.jsonc`

## What Deploys

The production site is deployed from:

- `dist/**`
- `functions/**`
- `wrangler.jsonc`
- `.github/workflows/deploy-cloudflare-pages.yml`

The GitHub Action is triggered on pushes to `main` when those paths change. It can also be started manually with workflow dispatch.

## Required GitHub Secrets

The repository must have these GitHub Actions secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

The Cloudflare API token must be able to deploy the `mojo-ai-summits` Pages project and read the Cloudflare resources bound to the project.

## Required Cloudflare Bindings

The Pages project needs the bindings defined in `wrangler.jsonc`:

- `MOJO_SUMMITS_SETUP_STATE`: KV namespace for the setup checklist shared state.
- `MOJO_SUMMITS_STORAGE`: R2 bucket binding for internal storage.

Current storage bucket name:

- `mojo-summits-private`

Cloudflare R2 must be enabled on the Cloudflare account before this bucket can be created. If R2 is not enabled, `wrangler r2 bucket create` returns Cloudflare API error `10042`.

## Standard Deploy Procedure

Use the repo alias when the user says `Deploy`:

1. Review current repo changes with `git status --short --untracked-files=all`.
2. Stage all deployable non-ignored changes with `git add -A`.
3. Commit staged changes with a concise message.
4. Run `git fetch origin`.
5. Run `git rebase origin/main`.
6. Resolve conflicts without discarding user work.
7. Push to `origin/main`.
8. Confirm the GitHub Actions Cloudflare Pages deployment succeeds.

## Manual Cloudflare Deploy Fallback

If GitHub Actions is unavailable, deploy the local `dist` folder directly:

```powershell
npx wrangler pages deploy dist --project-name mojo-ai-summits --branch main
```

Use this only as a fallback. The normal source of truth should remain GitHub `main`.

## Rollback

Cloudflare Pages supports rolling back to previous deployments from the Cloudflare dashboard:

1. Open Cloudflare dashboard.
2. Go to Workers & Pages.
3. Open `mojo-ai-summits`.
4. Go to Deployments.
5. Select a known-good deployment.
6. Roll back to that deployment.

After rollback, fix the repo and push a corrected deployment so GitHub `main` and production return to agreement.

## Production Checks

After deployment, verify:

- `https://mojoaisummits.com/` loads.
- Public routes such as `/virtual/` and `/vip-registration/` load without Cloudflare Access.
- Internal routes such as `/setup/`, `/events/`, `/crm/`, `/storage/`, `/budget/`, and `/mockups/` require Cloudflare Access.
- Internal APIs such as `/api/setup-state`, `/api/events`, `/api/crm`, `/api/storage`, and `/api/budget` are not publicly accessible.
- An approved Access user can open `/setup/` and shared checklist state works.

Do not push a production deployment with the R2 binding until the `mojo-summits-private` bucket exists, because Cloudflare Pages expects configured bindings to reference available resources.
