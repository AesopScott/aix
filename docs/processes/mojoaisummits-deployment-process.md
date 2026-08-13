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

Setup checklist entries are not deployed from Git. The `/setup/` page shell lives in `dist/setup/index.html`, but its shared checklist state is stored in the `MOJO_SUMMITS_SETUP_STATE` KV namespace under `master-event-execution-checklist`. The page writes each edit to browser `localStorage` first, queues failed shared writes in `localStorage`, retries pending writes on the 5-second sync loop, and only pulls fresh shared state after pending local writes have flushed. Local Wrangler preview uses local Miniflare KV state; production persistence happens when the live `https://mojoaisummits.com/api/setup-state` endpoint or an explicit remote KV sync writes to the production namespace.

## Required GitHub Secrets

The repository must have these GitHub Actions secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

The Cloudflare API token must be able to deploy the `mojo-ai-summits` Pages project and read the Cloudflare resources bound to the project.

## Required Cloudflare Bindings

The Pages project needs the bindings defined in `wrangler.jsonc`:

- `MOJO_SUMMITS_SETUP_STATE`: KV namespace for the setup checklist shared state.
- `MOJO_SUMMITS_STORAGE`: R2 bucket binding for internal storage.
- `MOJO_AUTH_DB`: optional D1 database binding for Mojo Auth users and sessions. If this binding is absent, Mojo Auth falls back to `MOJO_SUMMITS_SETUP_STATE`.

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
- Public routes such as `/virtual/` and `/member-registration/` load without Mojo Auth.
- `/access/` loads without a session so it can show the login screen.
- Before access control is enabled in `/access/`, internal routes such as `/setup/`, `/events/`, `/crm/`, `/storage/`, `/budget/`, and `/mockups/` remain freely accessible.
- After access control is enabled in `/access/`, internal routes and APIs follow their configured Mojo Auth route modes.
- After accounts and policies are configured, an approved Mojo Auth user can open `/setup/` and shared checklist state works.

Do not push a production deployment with the R2 binding until the `mojo-summits-private` bucket exists, because Cloudflare Pages expects configured bindings to reference available resources.
