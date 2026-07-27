# MojoAISummits.com Storage Process

## Purpose

Mojo AI Summits needs a controlled place for shared company and event files. The recommended Cloudflare setup is:

- Cloudflare R2 for object storage.
- Cloudflare Pages Functions for upload, list, download, and delete operations.
- Mojo Auth middleware in front of the storage portal and API.

## Routes

- Portal: `https://mojoaisummits.com/storage/`
- API: `https://mojoaisummits.com/api/storage`

The API intentionally rejects requests unless Mojo Auth has authenticated the user. Middleware validates the app-owned HttpOnly session cookie, attaches the user to the request context, and the storage API records that user as the uploader.

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
- `receipts/`: receipt uploads grouped by person.
- `archive/`: completed event records and long-term retention.

Each upload also includes an event, city, or folder value. Example object keys:

- `private/company/2026-07-26T18-10-00-000Z-a1b2c3d4-operating-agreement.pdf`
- `event-assets/dallas-2027/2026-07-26T18-10-00-000Z-b2c3d4e5-speaker-deck.pdf`
- `media/dallas-2027/2026-07-26T18-10-00-000Z-c3d4e5f6-stage-photo.jpg`
- `receipts/scott/2026-07-26T18-10-00-000Z-d4e5f6a7-hotel-receipt.pdf`

## Mojo Auth Setup

Before using the storage portal in production, protect both routes through `/access`:

- `/storage/`
- `/api/storage`

The repo-level access configuration protects the storage portal plus the other internal operating routes: `/admin/`, `/crm/`, `/setup/`, `/events/`, `/budget/`, `/mockups/`, and their internal APIs, including `/api/events`. Recommended account groups:

- Founders: Scott, Robert, Jodi, Ron
- Event Ops: Charlie, The Event Lounge
- Program/VIP: Angel
- Marketing: Jodi, Orbit Flow
- Media: Photography, Sound, and Cinematography Team
- Finance/Admin: Robert

Mojo Auth users are managed in `/access`. Passwords are stored only as PBKDF2-SHA256 hashes with random salts. Sessions are stored as token hashes and issued as HttpOnly cookies.

For production D1-backed auth, create and migrate a D1 database, then bind it as `MOJO_AUTH_DB`:

```powershell
npx wrangler d1 create mojo-summits-auth
npx wrangler d1 execute mojo-summits-auth --remote --file migrations/0001_auth.sql
```

Until `MOJO_AUTH_DB` is bound, Mojo Auth stores users and sessions in `MOJO_SUMMITS_SETUP_STATE`.

To create the first owner account, set a temporary Pages secret:

```powershell
npx wrangler pages secret put MOJO_AUTH_BOOTSTRAP_TOKEN --project-name mojo-ai-summits
```

Then submit the first owner through `/api/auth/bootstrap` from the `/access` page or a trusted admin script using `Authorization: Bearer <token>`. Remove or rotate the bootstrap token after the owner exists.

Recommended first users:

- Scott: owner
- Robert: admin or owner
- Jodi: admin

## Local Development

By default, the API requires a Mojo Auth session. For local testing only, create a local `.dev.vars` file that is not committed:

```text
MOJO_ACCESS_ALLOW_OPEN=true
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
- Confirm `/storage/` requires Mojo Auth login.
- Confirm `/api/storage` requires Mojo Auth login.
- Confirm an approved user can upload, list, download, and delete a test file.
- Confirm an unapproved user cannot access either route.
