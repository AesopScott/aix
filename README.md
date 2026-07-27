# Mojo AI Summits

Static Cloudflare Pages site for Mojo AI Summits.

- Production: https://mojoaisummits.com/
- VIP registration: https://mojoaisummits.com/vip-registration/
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

## VIP Registration

The home page registration action asks for an invite code, then sends guests to `/vip-registration/`.
VIP registrations are stored in the `MOJO_SUMMITS_SETUP_STATE` KV namespace under `vip-registration:*`.
The perpetual show/share code is `Mojo-4321`; direct visits to `/vip-registration/` prefill this code.

Phone verification is wired through `/api/phone-verification`. Until an SMS provider is configured, the route records phone status as `pending_sms_setup` and registrations are saved for manual phone confirmation.
