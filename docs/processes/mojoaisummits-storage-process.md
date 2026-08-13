# MojoAISummits.com Storage Process

## Purpose

Mojo AI Summits needs a controlled place for shared company and event files. The recommended Cloudflare setup is:

- Cloudflare R2 for object storage.
- Cloudflare Pages Functions for upload, list, download, and delete operations.
- Mojo Auth middleware in front of the storage portal and API.

## Routes

- Portal: `https://mojoaisummits.com/files/`
- Legacy portal path: `https://mojoaisummits.com/storage/`
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
- `partners/`: partner and sponsor packages, shared deliverables, and relationship materials.
- `membership/`: member program files, fellowship materials, and member-facing assets.
- `marketing/`: campaigns, messaging, creative, social, and outbound marketing assets.
- `receipts/`: receipt uploads grouped by person.
- `archive/`: completed event records and long-term retention.

Each upload also includes an event, city, or folder value. Example object keys:

- `private/company/2026-07-26T18-10-00-000Z-a1b2c3d4-operating-agreement.pdf`
- `event-assets/dallas-2027/2026-07-26T18-10-00-000Z-b2c3d4e5-speaker-deck.pdf`
- `media/dallas-2027/2026-07-26T18-10-00-000Z-c3d4e5f6-stage-photo.jpg`
- `receipts/scott/2026-07-26T18-10-00-000Z-d4e5f6a7-hotel-receipt.pdf`

Large browser uploads use the R2 multipart API through `/api/storage` instead of sending the entire file in one request. The `/files/` page keeps smaller files on the simple form upload path, but switches files at 64 MiB and above to 16 MiB parts, then completes or aborts the multipart session from the same authenticated API. This avoids Cloudflare request body limits for video drafts and other large media while preserving the same object naming and metadata rules.

Downloads require an additional email-code verification step. The `/files/` page itself, file listing, uploads, folder creation, renames, status updates, and deletes use the normal Mojo Auth session only. When a user clicks Download, the browser calls `/api/storage?mode=download-mfa-start` with the object key, the API emails a 6-digit code to the signed-in Mojo Auth email address through Microsoft Graph, and `/api/storage?mode=download-mfa-verify` sets a short-lived HttpOnly download cookie after the correct code is entered. The code expires after 10 minutes, has a maximum of 5 attempts, and the verified download session lasts 15 minutes.

The file list supports area, folder, text search, submitter filtering, and object-size sorting so admins can quickly find large files or uploads from a specific person.

## Mojo Auth Setup

Before using the storage portal in production, protect the Storage API through `/access`:

- `/api/storage`

The `/files/` page shell stays reachable so users can get to site sign-in and Storage instructions. Storage data and file operations remain protected by `/api/storage`. The `/budget/` page shell follows the same pattern so users can reach the Mojo Auth login flow, while budget data remains protected by `/api/budget`. The repo-level access configuration also protects the other internal operating routes: `/admin/`, `/crm/`, `/setup/`, `/events/`, `/mockups/`, and their internal APIs, including `/api/events`. Recommended account groups:

- Founders: Scott, Robert, Jodi, Ron
- Event Ops: Charlie, The Event Lounge
- Program/Member: Angel
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

To create the first owner account, set `MOJO_AUTH_BOOTSTRAP_TOKEN`, then open `/access/` while there are zero Mojo Auth users and create the initial Scott owner invite with that token. Open the returned invite link, set a password, and `scott@mojoaisummits.com` becomes the owner account. Remove or rotate the bootstrap token after the owner exists.

After the owner exists, create access invites in `/access` instead of assigning passwords directly. The owner/admin chooses the invitee email and role, then copies the generated single-use link. The invitee opens `/access/?invite=...` and creates their own separate Mojo password.

Recommended first invites:

- Scott: owner
- Robert: admin or owner
- Jodi: admin

## Local Development

Access control is disabled by default while accounts and route policies are being configured. After access control is enabled in `/access/`, the API requires a Mojo Auth session unless the storage route mode is changed. For local testing of enforced access only, create a local `.dev.vars` file that is not committed:

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
- Before enabling access control, confirm `/files/`, `/storage/`, and `/api/storage` remain reachable.
- After enabling access control, confirm `/files/` loads the Storage page shell and asks unauthenticated users to sign in before file operations.
- After enabling access control, confirm `/storage/` requires Mojo Auth login when no external Cloudflare Access rule intercepts it.
- After enabling access control, confirm `/api/storage` requires Mojo Auth login.
- Confirm an approved user can upload, list, download, and delete a test file.
- Confirm an approved user can upload and list without a download MFA prompt.
- Confirm a download attempt sends an email code and only downloads after the code is verified.
- Confirm an unapproved user cannot access either route.
