# Repository Agent Instructions

## Agent Identity

Scott refers to Codex as `DaVinci` across sessions. Treat `DaVinci` as the assistant's working name in this repository and in ongoing AIX/Mojo collaboration.

## Aliases

### Deploy

When the user says `Deploy`, include all non-ignored repo changes, including untracked files, then synchronize with the remote main branch and publish to `origin/main`:

1. Run `git status --short --untracked-files=all` and treat untracked files as deployable repo changes unless they are ignored or clearly local/private.
2. Stage all deployable changes with `git add -A`.
3. If anything is staged, commit it with a concise message that describes the deployed changes.
4. Run `git fetch origin`.
5. Run `git rebase origin/main`.
6. Resolve any rebase conflicts without discarding user work; ask the user if the conflict cannot be resolved safely.
7. Run `git push origin main`.
8. Confirm the GitHub Actions Cloudflare Pages deployment succeeds before reporting the deploy as complete.

Do not discard unrelated working-tree changes. Do not deploy ignored local files, secrets, dependency folders, local build caches, or local memory folders.

## Obsidian Updates

All Codex sessions working in this repository should update the AIX project Obsidian vault when they create durable project knowledge, operational notes, decisions, runbooks, or handoff context that should persist beyond the current chat.

- Obsidianify is optional per-developer automation. When it is installed, use the developer's local routing from `~/.obsidianify/config.json`, including `projects.aix.vaultPath` and `projects.aix.writeRoot`.
- Do not commit developer-specific absolute vault paths into repo instructions or hooks.
- Developers without Obsidianify should manually write requested Obsidian notes under the repo-relative `obsidian/AIX` vault in this checkout.
- When a user explicitly calls out an Obsidian write, create or update a concise note in `obsidian/AIX` even if automatic Obsidianify hooks are unavailable.
- Prefer concise, durable notes over raw transcripts.
- Do not write secrets, temporary passwords, recovery codes, MFA details, API tokens, or other credentials into Obsidian.
- Keep notes tied to the work actually performed in the session, including useful outcomes, decisions, and next steps.

## Brand Assets

Use `C:\Users\scott\Code\aix\docs\guidelines\MoJoSummitsBrandGuidelines.png` as the source of color truth for all Mojo AI Summits asset creation, including web images, OG images, social graphics, documents, presentations, and generated visual assets.

Primary palette:

- Deep Navy: `#0A0F1E`
- Electric Blue: `#1666FF`
- Cyan: `#00E6FF`
- Slate: `#1B2333`
- White: `#FFFFFF`

When creating new assets, preserve the brand direction shown in that guideline image: high-contrast deep navy backgrounds, electric blue/cyan highlights and glows, white typography where needed for legibility, and a polished executive AI events feel.

## Website Analytics, Privacy, and Consent

Before adding or changing website analytics, conversion tracking, advertising tags, cookie behavior, session replay, heatmaps, enrichment scripts, campaign attribution, or public form tracking, read:

`C:\Users\scott\Code\aix\docs\processes\website-analytics-privacy-conversion-standards.md`

Default to Cloudflare/low-data aggregate analytics and first-party operational conversion records. Do not add Google Analytics, Google Tag Manager, ad pixels, retargeting tags, fingerprinting, session replay, local-storage identifiers, or non-essential cookies unless the change also includes the required privacy notice update, consent mechanism, and review record defined in that standard.

Before launching a campaign page or registration funnel change, run:

`node scripts/check-website-analytics-privacy.mjs`

Treat any failure as a launch blocker until Robert, Jodi, or Scott explicitly accepts the risk.

## Email Administration

Mojo AI Summits company email is configured in Microsoft 365 with Exchange Online. When the user asks to create an email user or mailbox for the company, treat that as a Microsoft 365 user/mailbox task, not as a website CRM record, Cloudflare Access allowlist entry, or repo data change.

- Use the `mojoaisummits.com` email domain unless the user explicitly gives a different domain.
- For a first-name mailbox request, use the first name as the email alias. Example: Gina Monroe with "email should be Gina" means `gina@mojoaisummits.com`.
- Create the Microsoft 365 user with Microsoft Graph PowerShell or the Microsoft 365 admin center, assign a license that includes Exchange Online, and force a password change at first sign-in.
- A mailbox is created by Microsoft 365 after the user receives an Exchange Online license.
- Keep temporary passwords, recovery info, MFA secrets, and admin tokens out of the repo, chat summaries, logs, docs, and committed files.
- After creating a mailbox, add the user's address to Cloudflare Access or app-specific allowlists only when the user separately asks for site, storage, budget, or CRM access.

Preferred PowerShell flow:

1. Connect with `Connect-MgGraph -Scopes User.ReadWrite.All,Directory.ReadWrite.All,Organization.Read.All`.
2. Confirm `mojoaisummits.com` is a verified domain with `Get-MgDomain`.
3. Confirm an available Exchange-capable SKU with `Get-MgSubscribedSku`.
4. Create the user with `New-MgUser` using `GivenName`, `Surname`, `DisplayName`, `MailNickname`, `UserPrincipalName`, `UsageLocation`, `AccountEnabled`, and a temporary `PasswordProfile`.
5. Assign the selected license with `Set-MgUserLicense -AddLicenses ... -RemoveLicenses @()`.
6. Verify mailbox provisioning in Exchange Online with `Connect-ExchangeOnline` and `Get-EXOMailbox` or by checking the Microsoft 365 admin center.

<!-- AWS Agent Toolkit: start -->
## AWS Account Administration
- The AIX/Mojo AWS account used for SMS and billing review is account
  `238043188139` named `ravenshroud`.
- Local AWS CLI configuration normally includes profiles `default` and
  `mojo-sms`. Use the `default` profile first unless the user explicitly
  asks for another profile.
- Start AWS reviews through APIs/CLI, not by manually browsing the console.
  First run `aws sts get-caller-identity --output json` to confirm the
  account. If the CLI reports that the session expired, run `aws login` to
  refresh the local CLI session, let Scott complete any browser/MFA prompt,
  then return to API/CLI commands.
- Do not print, copy, or summarize AWS secret values. It is safe to report
  account id, account name, region, service names, resource ids, non-secret
  phone numbers, status values, and whether expected environment variable
  names are present.
- For SMS administration, use region `us-east-2` unless evidence shows the
  resource lives elsewhere. The currently production-enabled SMS account
  state is in `us-east-2`; `us-east-1` may still report SMS sandbox status.
- To review whether SMS verification can be used, check:
  `aws pinpoint-sms-voice-v2 describe-account-attributes --region us-east-2`,
  `aws sns get-sms-sandbox-account-status --region us-east-2`,
  `aws pinpoint-sms-voice-v2 describe-phone-numbers --region us-east-2`,
  and `aws pinpoint-sms-voice-v2 describe-registrations --region us-east-2`.
- For cost/billing review, use Cost Explorer APIs such as
  `aws ce get-cost-and-usage` grouped by `SERVICE`, `USAGE_TYPE`, and
  `RECORD_TYPE`. For SMS billing, inspect the `AWS End User Messaging`
  service and `USE2-PhoneNumber-Tollfree` usage type.
- If asked about an AWS Support Center case, try the API first with
  `aws support describe-cases --display-id <case-id> --include-resolved-cases --region us-east-1`.
  If AWS returns `SubscriptionRequiredException`, explain that this specific
  API namespace is unavailable for the account and continue with direct
  service, billing, and resource APIs. Use the Support Center link only when
  the user asks for interactive case text or case updates that the API cannot
  provide.

## AWS Guidance
- Prefer the AWS MCP Server for AWS interactions — it provides sandboxed
  execution, observability, and audit logging. If unavailable, use the
  AWS CLI directly.
- Before starting a task, check whether a relevant AWS skill is available.
  Load the skill with `retrieve_skill` and prefer its guidance over
  general knowledge.
- When uncertain about specific AWS details (API parameters, permissions,
  limits, error codes), verify against documentation rather than guessing.
  State uncertainty explicitly if you cannot confirm.
- When creating infrastructure, prefer infrastructure-as-code (AWS CDK or
  CloudFormation) over direct CLI commands.
- When working with infrastructure, follow AWS Well-Architected Framework
  principles.
- Do not use em dashes in AWS resource names or descriptions. Use
  hyphens instead.

## Secret Safety
- MUST load the `aws-secrets-manager` skill first for any secret,
  credential, API key, token, or password task. MUST NOT call
  `secretsmanager get-secret-value` or `batch-get-secret-value`, and MUST
  NOT hit the Secrets Manager Agent daemon directly. MUST use
  `{{resolve:secretsmanager:secret-id:SecretString:json-key}}` with
  `asm-exec` so the secret resolves at runtime without entering context.
<!-- AWS Agent Toolkit: end -->
