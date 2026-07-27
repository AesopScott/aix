# Mojo AI Summits

Static Cloudflare Pages site for Mojo AI Summits.

- Production: https://mojoaisummits.com/
- Setup checklist: https://mojoaisummits.com/setup/
- Internal storage portal: https://mojoaisummits.com/storage/
- Internal budget and P&L: https://mojoaisummits.com/budget/
- Cloudflare Pages project: `mojo-ai-summits`

## Internal Storage

The storage portal uses a private Cloudflare R2 bucket bound to Pages Functions as `MOJO_SUMMITS_STORAGE`.

- Bucket: `mojo-summits-private`
- API route: `/api/storage`
- Portal route: `/storage/`
- Access control: protect both `/storage/*` and `/api/storage*` with Cloudflare Access before production use.
- Cloudflare prerequisite: R2 must be enabled on the Cloudflare account before the bucket can be created and before this binding can deploy successfully.

## Deploy

GitHub Actions deploys `dist/` to Cloudflare Pages on pushes to `main` and through manual workflow dispatch.

Required GitHub secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
