# Mojo AI Summits

Static Cloudflare Pages site for Mojo AI Summits.

- Production: https://mojoaisummits.com/
- Setup checklist: https://mojoaisummits.com/setup/
- Cloudflare Pages project: `mojo-ai-summits`

## Deploy

GitHub Actions deploys `dist/` to Cloudflare Pages on pushes to `main` and through manual workflow dispatch.

Required GitHub secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
