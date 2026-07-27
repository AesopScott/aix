# MojoAISummits.com Storage Process

## Purpose

Mojo AI Summits needs a controlled place for shared company and event files. The recommended Cloudflare setup is:

- Cloudflare R2 for object storage.
- Cloudflare Pages Functions for upload, list, download, and delete operations.
- Cloudflare Access in front of the storage portal and API.

## Routes

- Portal: `https://mojoaisummits.com/storage/`
- API: `https://mojoaisummits.com/storage/api`

The API intentionally rejects requests unless Cloudflare Access passes an authenticated user email through the `Cf-Access-Authenticated-User-Email` header.

## R2 Bucket

First enable R2 in the Cloudflare dashboard for the account that owns `mojoaisummits.com`. Bucket creation fails with Cloudflare API error `10042` until R2 is enabled.

Create one private R2 bucket:

```powershell
npx wrangler r2 bucket create mojo-summits-private
```

Bind it to the Pages project as:

- Binding name: `MOJO_SUMMITS_STORAGE`
- Bucket name: `mojo-summits-private`

The binding is already declared in `wrangler.jsonc`.

## Storage Areas

The portal organizes uploads into these top-level areas:

- `private/`: company records, contracts, finance, operating materials.
- `event-assets/`: speaker files, sponsor files, city event assets.
- `media/`: photography, sound, cinematography, raw captures, edited assets.
- `public-assets/`: files intended for public use or eventual website publication.
- `archive/`: completed event records and long-term retention.

Each upload also includes an event, city, or folder value. Example object keys:

- `private/company/2026-07-26T18-10-00-000Z-a1b2c3d4-operating-agreement.pdf`
- `event-assets/dallas-2027/2026-07-26T18-10-00-000Z-b2c3d4e5-speaker-deck.pdf`
- `media/dallas-2027/2026-07-26T18-10-00-000Z-c3d4e5f6-stage-photo.jpg`

## Cloudflare Access Setup

Before using the storage portal in production, protect both routes with Cloudflare Access:

- `mojoaisummits.com/storage/*`

Use the same allow policy for both routes. Recommended groups:

- Founders: Scott, Robert, Jodi, Ron
- Event Ops: Charlie, The Event Lounge
- Program/VIP: Angel
- Marketing: Jodi, Orbit Flow
- Media: Photography, Sound, and Cinematography Team
- Finance/Admin: Robert

The API can also enforce an optional email allowlist by setting this Pages environment variable:

```text
MOJO_STORAGE_ALLOWED_EMAILS=scott@example.com,robert@example.com,jodi@example.com
```

If the allowlist is empty, Cloudflare Access controls access by policy alone.

This repo includes a manual GitHub Actions workflow for creating the Access applications:

- Workflow: `Configure Mojo AI Summits Cloudflare Access`
- Script: `scripts/configure-cloudflare-access.mjs`
- Required GitHub secret: `CLOUDFLARE_ACCESS_API_TOKEN`
- Required token permissions:
  - `Access: Apps and Policies Write`
  - `Access: Organizations, Identity Providers, and Groups Write`

Run the workflow with a comma-separated list of allowed emails. Until Mojo AI Summits full-time addresses are created, use:

- `scott@mojoaistudio.com`
- `jodi@sofractional.com`
- `robert@cyber1grc.com`

The workflow also ensures the `One-time PIN login` identity provider exists so approved users can receive a Cloudflare Access login code by email.

The existing `CLOUDFLARE_API_TOKEN` is kept focused on Pages deployment. Access configuration uses a separate account-owned token so deployment and Zero Trust administration can be rotated independently.

## Local Development

By default, the API requires Cloudflare Access headers. For local testing only, create a local `.dev.vars` file that is not committed:

```text
MOJO_STORAGE_ALLOW_OPEN=true
```

Then run Pages locally with an R2 binding:

```powershell
npx wrangler pages dev dist --r2=MOJO_SUMMITS_STORAGE
```

## Operating Rules

- Do not store secrets, API keys, or password exports in R2.
- Do not use R2 as the only live editing workspace for active collaborative documents.
- Use Google Drive or Microsoft 365 for live drafts if needed, then archive final files to R2.
- Keep contracts, finance files, and private attendee records under `private/`.
- Keep raw and edited media under `media/`.
- Move completed event packages into `archive/` after post-event closeout.
- Delete only when the owner of the file category confirms the file is obsolete.

## Security Checks

Before declaring storage ready:

- Confirm the R2 bucket exists.
- Confirm `MOJO_SUMMITS_STORAGE` is bound to the Pages project.
- Confirm `/storage/` requires Cloudflare Access login.
- Confirm `/storage/api` requires Cloudflare Access.
- Confirm an approved user can upload, list, download, and delete a test file.
- Confirm an unapproved user cannot access either route.
