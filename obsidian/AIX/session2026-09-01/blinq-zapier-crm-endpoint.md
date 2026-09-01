# Blinq Zapier CRM Endpoint

Date: 2026-09-01
Agent: Codex / DaVinci

## Outcome

Scott clarified that Mojo will use Blinq and Zapier instead of building a native mobile scanner first. A secured Cloudflare Pages Function endpoint was added locally at `/api/blinq-contact`.

## Implementation

- Endpoint accepts POST payloads from Zapier with `name`, `job_title`, `company`, `email`, and `profile_photo`, plus optional `phone`.
- Authenticated GET returns a Zapier-friendly health response that lists `phone` as optional.
- Endpoint accepts optional relationship/classification fields for potential guest, featured guest, speaker, roundtable leader, partner candidate, and strategic partner contact routing.
- Authentication uses an API key in `Authorization: Bearer <api-key>` or `x-api-key`.
- Preferred Cloudflare secret is `MOJO_BLINQ_ZAPIER_API_KEY`.
- CRM writes upsert by verified email under `crm:contact:{email}` and append a `blinq-zapier` activity record.

## Source Artifact

Durable setup documentation created at `docs/processes/blinq-zapier-crm-endpoint.md`.

