# Mojo AI Summits

Static Cloudflare Pages site for Mojo AI Summits.

- Production: https://mojoaisummits.com/
- VIP registration: https://mojoaisummits.com/vip-registration/
- Internal CRM: https://mojoaisummits.com/crm/
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
Direct visits to `/vip-registration/` are allowed for previewing and sharing the registration page without exposing an invite code in the browser.

Phone verification is wired through `/api/phone-verification`. Until an SMS provider is configured, the route records phone status as `pending_sms_setup` and registrations are saved for manual phone confirmation.

To enable AWS SNS SMS verification, configure these Cloudflare Pages environment variables/secrets:

- `SMS_PROVIDER=aws-sns`
- `SMS_PROVIDER_CONFIGURED=true`
- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_SESSION_TOKEN` if the AWS credentials are temporary
- `AWS_SNS_SMS_ORIGINATION_NUMBER` optional, recommended when the account has a dedicated SMS phone number
- `AWS_SNS_SMS_SENDER_ID` optional, only for countries/regions that support sender IDs
- `PHONE_VERIFICATION_SECRET` random app secret for hashing temporary SMS codes

The AWS principal needs permission for `sns:Publish`. If the AWS account is still in the Amazon SNS SMS sandbox, test texts can only be sent to sandbox-verified destination phone numbers.

## CRM

The internal CRM lives at `/crm/` and reads from `/api/crm`.
VIP registrations are written to both `vip-registration:*` and `crm:vip-registrant:*` in `MOJO_SUMMITS_SETUP_STATE`.
The CRM's VIP Registrants section includes contact details, roles, food preferences, phone verification status, CRM status, notes, and CSV export.
