# Repository Agent Instructions

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

All Codex sessions working in this repository should update the project Obsidian vault at `C:\Users\scott\Code\aix\obsidian\AIX` when they create durable project knowledge, operational notes, decisions, runbooks, or handoff context that should persist beyond the current chat.

- Treat `C:\Users\scott\Code\aix\obsidian\AIX` as the repo-local Obsidian knowledge base for AIX.
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
