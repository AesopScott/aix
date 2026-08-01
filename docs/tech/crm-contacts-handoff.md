# Handoff: Guest registrations not appearing in CRM Contacts

**Date:** 2026-07-31
**Status:** Root cause identified. No code changed by this analysis.
**Verified against:** commits `17598e6` and `a90304d`, Cloudflare Pages project `mojo-ai-summits`, KV namespace `90f60403fcf2469987cec51bdc3cde72`.

---

## Summary

The CRM running at `mojoaisummits.com/crm/` is **a different application from the one this repository builds**. Every recent fix has been applied to the repo's CRM page and its `/api/crm` endpoint, both of which deploy correctly — but the CRM actually open in the browser is served by a different origin and calls a different API surface. That is why four consecutive fix attempts produced no visible change.

The registration write path itself is working. Guest registrations do create contact records in KV.

---

## Root cause

### Two different CRM applications

| | Repo build | Live at mojoaisummits.com |
|---|---|---|
| Page | `dist/crm/index.html`, 42,853 bytes, hand-written | 1,089-byte Vite SPA shell (`<div id="app">`) |
| Bundle | none — inline `<script>` | `/crm/assets/index-BPkv2ncC.js` (549 KB) |
| API called | `const api = "/api/crm"` (hardcoded) | `/api/contacts`, `/api/companies`, `/api/deals`, `/api/stages`, `/api/activities`, `/api/stats`, `/api/custom-fields`, `/api/vip-invite-codes` |
| Self-description | "CRM" | "Contact relationship manager with companies, contacts, and deals" |

Searching the live page for `/api/crm` returns **zero** matches.

### Three independent confirmations they are different origins

1. **Access control differs.** The repo's own Pages deployment returns **401** for `/crm/` (middleware guards it as allowlist-only). The live domain returns **200** for the same path and never hits that middleware.
   - `https://99492e99.mojo-ai-summits.pages.dev/crm/` → `HTTP 401`
   - `https://mojoaisummits.com/crm/` → `HTTP 200`

2. **Response headers differ.** `/guest/` carries the security headers defined in `dist/_headers` (`x-frame-options: SAMEORIGIN`, `x-content-type-options: nosniff`, `Access-Control-Allow-Origin: *`). `/crm/` carries none of them and returns a different `Content-Type` (`text/html` with no charset, plus `Cache-Control: no-store, max-age=0`).

3. **Assets exist live that do not exist in the repo.** `dist/crm/` contains only `index.html` — there is no `assets/` directory — yet `https://mojoaisummits.com/crm/assets/index-BPkv2ncC.js` returns 200 with a 549 KB bundle.

Most likely a Cloudflare Worker route bound to `mojoaisummits.com/crm*` on the apex domain, taking precedence over the Pages project. **This has not been confirmed** — see Open Questions.

### Corroborating symptom

`https://mojoaisummits.com/api/companies` returns **HTTP 200 with the marketing homepage HTML**, because no such Function exists and the request falls through to static assets. The live CRM calls that endpoint and receives HTML where it expects JSON.

---

## Verified: the registration write path works

Method: exported all 51 production KV keys to a local namespace (read-only on production), ran the real Functions locally via `wrangler pages dev`, and submitted a registration end to end.

`POST /api/guest-registration` returned `201` and produced a correct contact record — name, company, title, phone, email, source, and a linked event entry. Production KV agrees: both `crm:contact:gina@mojoaisummits.com` and `crm:contact:test@example.com` exist and are populated.

**"Registrations never reach contacts" is not true of the current code.**

### Timeline worth noting

- Last production guest registration: `2026-07-31T18:50:41.616Z`
- Commit `17598e6` ("Add CRM contacts view and rebuild") deployed: `2026-07-31T19:06:37Z`

The entire Contacts view — `type=contacts`, `rebuildContactsFromRegistrants`, `normalizeContactRecord`, and the UI option — was introduced in `17598e6`. **No registration has been submitted against that build in production.** Some of the reported symptoms predate the code intended to fix them.

Also: the production contact record carries `updatedBy: "contact-backfill"`. That string appears nowhere in the codebase, so production contact state was written by an out-of-repo script at some point. Keep that in mind — it can mask whether the application path actually works.

---

## Verified secondary bugs (in the repo's own path)

### 1. `industry` is silently dropped

The registration form requires `industry` and the registration record stores it, but the contact object built in `functions/_registration-crm.js:304` never copies the field.

- `normalizeContactRecord()` at `functions/api/crm.js:209` reads `record.industry`, which is always absent → always `""`.
- The CRM contacts table renders `row.industry` at `dist/crm/index.html:840` → always blank.

Demonstrated: registered a test guest with `industry: "Manufacturing"`; the contact returned `industry: ""`.

### 2. Event name is the invite code

`eventIdentity()` at `functions/_registration-crm.js:85` falls back to `inviteCode` when the event fields are empty. The guest form only sends `inviteCode`, `name`, `company`, `title`, `industry`, `email`, `phone`, and the publication flags (`dist/guest/index.html:635`), and `cleanPayload()` at `functions/_registration-crm.js:153` would not accept event fields even if they were sent. Format-only invite codes yield empty invite metadata.

Result: every contact's event displays as a bare six-digit number. Production contacts currently read "748992", "309122", "410563", and similar.

---

## Suspected but NOT confirmed

Do not treat these as diagnosed.

### Concurrent same-key writes in the contacts rebuild

`functions/api/crm.js:289` runs `Promise.all` over all registrant rows, each performing a read-modify-write against `crm:contact:{email}`. Seven of the eight production guest registrations share one email, so seven concurrent cycles target the same key. Workers KV also rate-limits writes to a single key to roughly one per second, and errors are swallowed by `.catch(() => null)` on line 292.

**I attempted to reproduce event loss locally and all seven events survived.** The hazard is real in principle but unproven; local KV timing may not reflect production network latency.

### Rebuild-on-every-read scaling

`contacts()` at `functions/api/crm.js:301` re-upserts every member, guest, and partner registrant on every CRM page load — roughly six KV operations per registrant. Cloudflare caps subrequests per request (50 on Free, 1000 on Paid). `listKeys()` at line 240 has no error handling, so a throw there would fail the whole request with a 500. Not currently triggering at this data volume.

### KV list eventual consistency

`contacts()` writes contacts and then immediately calls `list({prefix: "crm:contact:"})` on line 303. Workers KV `list()` is eventually consistent. I observed a prefixed list returning one key while a full list of the same namespace returned two, but I **cannot rule out** that the second key was simply created in between, so this is not claimed as observed.

---

## Ruled out

- KV binding missing or misconfigured in production — `wrangler.jsonc` binds `MOJO_SUMMITS_SETUP_STATE` correctly and reads/writes succeed.
- `dist/_worker.js` shadowing the Functions directory — no such file exists.
- `_redirects` shadowing `/api/*` — no matching rules.
- Registration payload field-name mismatch — form `name` attributes match `cleanPayload()` exactly.
- Failed deploys — every GitHub Actions run in the relevant window completed successfully.

---

## Open questions for whoever picks this up

1. **Where is the live CRM SPA deployed from?** Which repo, which project, and what binds it to `mojoaisummits.com/crm*`? This is the blocking question.
2. **Which CRM is the intended one going forward** — point the live SPA at this repo's API, or take over `/crm/` with the repo's own page? Everything else depends on this.
3. **What is the `/api/contacts` contract the SPA expects?** Commit `a90304d` began adding `functions/api/contacts.js` and `functions/api/stats.js`. Those need to match the SPA's expected shape, which can be read out of the live bundle.
4. **What wrote the `contact-backfill` records,** and does that script still need to exist?

---

## How to re-verify

```bash
# Live CRM is not the repo's page
curl -s https://mojoaisummits.com/crm/ | head -20
grep -c "api/crm" dist/crm/index.html    # repo page calls /api/crm

# Repo's Pages deployment guards /crm/ with 401; live domain returns 200
curl -sI https://mojoaisummits.com/crm/ | head -1

# API surface the live SPA actually calls
curl -s https://mojoaisummits.com/crm/assets/index-BPkv2ncC.js \
  | grep -oE '"/[a-zA-Z0-9/_.-]*api[a-zA-Z0-9/_.-]*"' | sort -u

# /api/companies returns homepage HTML with a 200
curl -s https://mojoaisummits.com/api/companies | head -5

# Production KV state (read-only)
npx wrangler kv key list --namespace-id 90f60403fcf2469987cec51bdc3cde72 --remote
```

To reproduce the local end-to-end test, export production KV with `wrangler kv bulk get`, load it into a local namespace with `wrangler kv bulk put --local`, run `wrangler pages dev`, then POST to `/api/guest-registration` and GET `/api/crm?type=contacts`. Local requests bypass auth via `isLocalRequest()` in `functions/_access-control.js:850`.

---

## Provenance and caveats

- **Another agent was committing to this repo during the analysis.** `HEAD` moved twice mid-session (`5914cf5` → `17598e6` → `a90304d`), and `functions/api/contacts.js` and `functions/api/stats.js` appeared partway through. Commit `a90304d` ("Serve contacts to live CRM API") suggests that agent independently reached the same conclusion about `/api/contacts`. Re-check current `HEAD` before acting on anything here.
- **No code was altered by this analysis.**
- All production access was read-only: `kv key list`, `kv key get`, `kv bulk get`, and HTTP GETs.
- Write testing was local only: a seeded KV copy under `.wrangler/state` (gitignored), a test registration for `dana@acmerobotics.com`, and one local contact key deleted and regenerated. None of this touched production.
