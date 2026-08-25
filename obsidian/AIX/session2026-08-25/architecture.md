## 2026-08-25T07:46:05-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\18\rollout-2026-08-18T09-17-43-01a01573-280c-7c02-9c13-5c52c6dd3f67.jsonl
- Turn Id: 01a0359f-fe47-7610-a9a9-3285920a0dc8
- Classification: valuable
- Information Type: Architecture
- Reason: durable implementation outcome
- Trigger Prompt Hash: b0664c28dbfd12b2

### Prompt Memory

Automation: Daily Mojo AI Summits Receipt Review
Automation ID: daily-mojo-ai-summits-receipt-review
Automation memory: $CODEX_HOME/automations/daily-mojo-ai-summits-receipt-review/memory.md
Review Mojo AI Summits budget receipts for the /budget profit-and-loss workflow. Work in C:\Users\scott\Code\aix. Use the existing Cloudflare/R2 storage configuration and local credentials only as needed, without printing secrets. Confirm the /budget API ingests all receipts under receipts/ as costs, create the daily receipt review snapshot if possible, and summarize new receipts, receipts missing dollar amounts, reviewed/reimbursed totals, and any errors that need Scott's attention. Mandatory completion

[Prompt excerpt truncated by Obsidianify.]

### Assistant Outcome

Done. I added a **Potential Sponsor** checkbox to the guest matrix.

What changed:
- Guest Matrix add form now has a `Potential Sponsor` box.
- Guest Matrix table now has a `Potential Sponsor` column with a checkbox per guest.
- Guest Matrix summary now counts `Potential Sponsors`.
- The flag saves through the CRM API for guest matrix prospects and existing guest/member invite rows.
- If you create an invite from a guest matrix row, the sponsor flag carries into the new invite record.

Verified:
- `node --check functions/api/crm.js`
- CRM inline script parse check
- `git diff --check -- dist/crm/index.html functions/api/crm.js`

Not deployed yet. Also note: there are other pre-existing local changes in the worktree, so I kept this scoped to [dist/crm/index.html](C:/Users/scott/Code/aix/dist/crm/index.html:1872) and [functions/api/crm.js](C:/Users/scott/Code/aix/functions/api/crm.js:4051).
## 2026-08-25T07:51:42-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\24\rollout-2026-08-24T09-46-54-01a03474-0798-7de3-887f-8a807d207292.jsonl
- Turn Id: 01a0392b-9062-7bf1-b1f2-a1ac7880ce87
- Classification: valuable
- Information Type: Architecture
- Reason: durable implementation outcome
- Trigger Prompt Hash: b0664c28dbfd12b2

### Prompt Memory

Automation: Daily Mojo AI Summits Receipt Review
Automation ID: daily-mojo-ai-summits-receipt-review
Automation memory: $CODEX_HOME/automations/daily-mojo-ai-summits-receipt-review/memory.md
Review Mojo AI Summits budget receipts for the /budget profit-and-loss workflow. Work in C:\Users\scott\Code\aix. Use the existing Cloudflare/R2 storage configuration and local credentials only as needed, without printing secrets. Confirm the /budget API ingests all receipts under receipts/ as costs, create the daily receipt review snapshot if possible, and summarize new receipts, receipts missing dollar amounts, reviewed/reimbursed totals, and any errors that need Scott's attention. Mandatory completion

[Prompt excerpt truncated by Obsidianify.]

### Assistant Outcome

The code **did work** for that number.

I checked production debug logs for `*******7422`:

- SMS code sent successfully
- confirmation received
- confirmation succeeded
- status became `verified`

That happened three times around **6:10 AM MDT today, August 25, 2026**. There are **no** mismatch/expired/too-many-attempt errors for that number.

The real problem is probably after verification: I found **no CRM/registration record** for that phone, so they verified the phone but did not successfully submit the registration.

I also found and patched a fragile spot locally:

- [functions/api/phone-verification.js](/C:/Users/scott/Code/aix/functions/api/phone-verification.js): already-verified phones now return `verified` instead of forcing another code.
- [functions/_registration-crm.js](/C:/Users/scott/Code/aix/functions/_registration-crm.js): registration now checks the server-side verified-phone ledger instead of trusting only the browser’s hidden field.
- [dist/guest/index.html](/C:/Users/scott/Code/aix/dist/guest/index.html): guest form now respects a `verified` response.

Verified with:

- `node --check functions/api/phone-verification.js`
- `node --check functions/_registration-crm.js`

This is fixed locally, but **not live until deployed**.
## 2026-08-25T07:55:09-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\24\rollout-2026-08-24T09-46-54-01a03474-0798-7de3-887f-8a807d207292.jsonl
- Turn Id: 01a03930-cc08-7802-8c8b-cca6659e89aa
- Classification: valuable
- Information Type: Architecture
- Reason: durable implementation outcome
- Trigger Prompt Hash: b0664c28dbfd12b2

### Prompt Memory

Automation: Daily Mojo AI Summits Receipt Review
Automation ID: daily-mojo-ai-summits-receipt-review
Automation memory: $CODEX_HOME/automations/daily-mojo-ai-summits-receipt-review/memory.md
Review Mojo AI Summits budget receipts for the /budget profit-and-loss workflow. Work in C:\Users\scott\Code\aix. Use the existing Cloudflare/R2 storage configuration and local credentials only as needed, without printing secrets. Confirm the /budget API ingests all receipts under receipts/ as costs, create the daily receipt review snapshot if possible, and summarize new receipts, receipts missing dollar amounts, reviewed/reimbursed totals, and any errors that need Scott's attention. Mandatory completion

[Prompt excerpt truncated by Obsidianify.]

### Assistant Outcome

The JSON is valid. The red underline is probably AWS saying **`sms-voice:DescribePhonePools` is not a valid action name**.

Use this instead:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowSmsConfigurationRead",
      "Effect": "Allow",
      "Action": [
        "sms-voice:DescribePhoneNumbers",
        "sms-voice:DescribePools",
        "sms-voice:DescribeAccountAttributes",
        "sms-voice:DescribeRegistrations"
      ],
      "Resource": "*"
    }
  ]
}
```

I changed:

`DescribePhonePools`

to:

`DescribePools`

Then click **Next** or **Review policy** and save it.
## 2026-08-25T08:05:03-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\24\rollout-2026-08-24T09-46-54-01a03474-0798-7de3-887f-8a807d207292.jsonl
- Turn Id: 01a03932-4f77-7d13-accb-860d3349dd1e
- Classification: valuable
- Information Type: Architecture
- Reason: durable implementation outcome
- Trigger Prompt Hash: b0664c28dbfd12b2

### Prompt Memory

Automation: Daily Mojo AI Summits Receipt Review
Automation ID: daily-mojo-ai-summits-receipt-review
Automation memory: $CODEX_HOME/automations/daily-mojo-ai-summits-receipt-review/memory.md
Review Mojo AI Summits budget receipts for the /budget profit-and-loss workflow. Work in C:\Users\scott\Code\aix. Use the existing Cloudflare/R2 storage configuration and local credentials only as needed, without printing secrets. Confirm the /budget API ingests all receipts under receipts/ as costs, create the daily receipt review snapshot if possible, and summarize new receipts, receipts missing dollar amounts, reviewed/reimbursed totals, and any errors that need Scott's attention. Mandatory completion

[Prompt excerpt truncated by Obsidianify.]

### Assistant Outcome

Deployed the SMS fix to production.

What changed:
- Version bumped to `0.1.152`.
- Already-verified phones now return `verified` instead of forcing a new SMS code.
- Registration now checks the server-side verified-phone ledger, so stale browser state won’t block a verified user.
- Guest form now preserves `verified` when the API says the phone is already verified.

Verified:
- GitHub PR #182 merged and Cloudflare Pages deploy succeeded.
- Production `/guest/` is serving the updated SMS handling.
- Production `/api/phone-verification` returns the updated phone validation message.

AWS permission check now works. The token can read SMS config. Current AWS state:
- Account tier: `PRODUCTION`
- Active number: `+18556268271`
- Registration: `COMPLETE`
- Two-way replies: `false`
- No SMS pools configured

So: **the new read permissions worked, and the active SMS number still does not have replies enabled.**

Timing:
- Inspect/scope: 0:18
- Fetch/patch prep: 0:08
- Deploy worktree/edit/version: 1:42
- Checks/diff review: 0:24
- Stage/commit: 0:23
- Push/PR: 0:54
- Merge: 0:42
- GitHub Actions/Cloudflare deploy: 1:52
- Production + AWS verification: 0:58
- Total: 7:21

::git-create-branch{cwd="C:\Users\scott\Code\aix-deploy-sms-verification-20260825" branch="codex/deploy-sms-verification-20260825"}
::git-stage{cwd="C:\Users\scott\Code\aix-deploy-sms-verification-20260825"}
::git-commit{cwd="C:\Users\scott\Code\aix-deploy-sms-verification-20260825"}
::git-push{cwd="C:\Users\scott\Code\aix-deploy-sms-verification-20260825" branch="codex/deploy-sms-verification-20260825"}
::git-create-pr{cwd="C:\Users\scott\Code\aix-deploy-sms-verification-20260825" branch="codex/deploy-sms-verification-20260825" url="https://github.com/AesopScott/aix/pull/182" isDraft=false}
## 2026-08-25T08:16:44-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\24\rollout-2026-08-24T09-46-54-01a03474-0798-7de3-887f-8a807d207292.jsonl
- Turn Id: 01a0393e-17a8-7251-bede-80e8224e55b2
- Classification: valuable
- Information Type: Architecture
- Reason: durable prompt/outcome signal
- Trigger Prompt Hash: b0664c28dbfd12b2

### Prompt Memory

Automation: Daily Mojo AI Summits Receipt Review
Automation ID: daily-mojo-ai-summits-receipt-review
Automation memory: $CODEX_HOME/automations/daily-mojo-ai-summits-receipt-review/memory.md
Review Mojo AI Summits budget receipts for the /budget profit-and-loss workflow. Work in C:\Users\scott\Code\aix. Use the existing Cloudflare/R2 storage configuration and local credentials only as needed, without printing secrets. Confirm the /budget API ingests all receipts under receipts/ as costs, create the daily receipt review snapshot if possible, and summarize new receipts, receipts missing dollar amounts, reviewed/reimbursed totals, and any errors that need Scott's attention. Mandatory completion

[Prompt excerpt truncated by Obsidianify.]

### Assistant Outcome

Totally fair.

I mean this:

When someone replies to a Mojo text, we can make the system send **you an email** that says:

**New SMS reply from [person / phone number]**

Message:
> “Yes, I’ll be there.”

Related contact:
> Gina Monroe / Acme Corp / AI Executive Readiness event

Then the system also saves that reply in the CRM/contact record so we don’t lose it.

So “email + CRM log” means:

1. **Email notification**
   You or the team get an email whenever someone texts back.

2. **CRM log**
   The text reply is saved inside the Mojo system under that person/contact/event.

It does **not** mean the person is replying by email.
They still reply by text. We just receive and route that text into email/CRM so a human can see it.
## 2026-08-25T08:17:10-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\24\rollout-2026-08-24T09-46-54-01a03474-0798-7de3-887f-8a807d207292.jsonl
- Turn Id: 01a0393e-59b1-7713-be10-a13e17ec070a
- Classification: valuable
- Information Type: Architecture
- Reason: durable implementation outcome
- Trigger Prompt Hash: b0664c28dbfd12b2

### Prompt Memory

Automation: Daily Mojo AI Summits Receipt Review
Automation ID: daily-mojo-ai-summits-receipt-review
Automation memory: $CODEX_HOME/automations/daily-mojo-ai-summits-receipt-review/memory.md
Review Mojo AI Summits budget receipts for the /budget profit-and-loss workflow. Work in C:\Users\scott\Code\aix. Use the existing Cloudflare/R2 storage configuration and local credentials only as needed, without printing secrets. Confirm the /budget API ingests all receipts under receipts/ as costs, create the daily receipt review snapshot if possible, and summarize new receipts, receipts missing dollar amounts, reviewed/reimbursed totals, and any errors that need Scott's attention. Mandatory completion

[Prompt excerpt truncated by Obsidianify.]

### Assistant Outcome

Built the local reply receiver and created the AWS topic.

Done:
- Added `/api/sms-inbound` at [functions/api/sms-inbound.js](C:/Users/scott/Code/aix-sms-inbound-replies-20260825/functions/api/sms-inbound.js)
- Added it as a public route in [functions/_access-control.js](C:/Users/scott/Code/aix-sms-inbound-replies-20260825/functions/_access-control.js)
- Created SNS topic: `arn:aws:sns:us-east-2:238043188139:mojo-sms-inbound-replies`
- Added a local ops note: [configuration.md](C:/Users/scott/Code/aix-sms-inbound-replies-20260825/obsidian/AIX/session2026-08-25/configuration.md)

What it does:
- Verifies AWS SNS signatures before accepting anything
- Auto-confirms SNS subscription messages
- Stores inbound SMS replies in KV
- Dedupe-protects SNS retries
- Finds matching CRM contacts by phone number
- Adds an `sms` activity to the CRM contact
- Sends staff an email with the reply
- Records STOP-style replies as opt-outs

Not done yet:
- Not deployed
- Not subscribed to SNS yet
- Two-way is still disabled on `+18556268271`

Next after deploy:
```powershell
aws sns subscribe --region us-east-2 --topic-arn arn:aws:sns:us-east-2:238043188139:mojo-sms-inbound-replies --protocol https --notification-endpoint https://mojoaisummits.com/api/sms-inbound

aws pinpoint-sms-voice-v2 update-phone-number --region us-east-2 --phone-number-id phone-7116c6268f1442c89cc4cd8a14c93bfa --two-way-enabled --two-way-channel-arn arn:aws:sns:us-east-2:238043188139:mojo-sms-inbound-replies
```

Verified:
- `node --check` passed
- Unsigned fake SNS message gets rejected with `SNS signature is missing`
- AWS topic exists with `0` confirmed subscriptions
- IAM simulation is not allowed for this user, so I could not preflight `sns:Subscribe` / `sms-voice:UpdatePhoneNumber` without actually running them

[Outcome truncated by Obsidianify.]
## 2026-08-25T08:31:25-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\18\rollout-2026-08-18T09-17-43-01a01573-280c-7c02-9c13-5c52c6dd3f67.jsonl
- Turn Id: 01a0394d-d646-7c00-b3c4-5130d2d40de5
- Classification: valuable
- Information Type: Architecture
- Reason: durable implementation outcome
- Trigger Prompt Hash: b0664c28dbfd12b2

### Prompt Memory

Automation: Daily Mojo AI Summits Receipt Review
Automation ID: daily-mojo-ai-summits-receipt-review
Automation memory: $CODEX_HOME/automations/daily-mojo-ai-summits-receipt-review/memory.md
Review Mojo AI Summits budget receipts for the /budget profit-and-loss workflow. Work in C:\Users\scott\Code\aix. Use the existing Cloudflare/R2 storage configuration and local credentials only as needed, without printing secrets. Confirm the /budget API ingests all receipts under receipts/ as costs, create the daily receipt review snapshot if possible, and summarize new receipts, receipts missing dollar amounts, reviewed/reimbursed totals, and any errors that need Scott's attention. Mandatory completion

[Prompt excerpt truncated by Obsidianify.]

### Assistant Outcome

Fixed. In the guest matrix role cell, it now shows only one show label:

- `Registered for: ...` if registered show data exists
- otherwise `Assigned: ...`

Verified the CRM inline script still parses and `git diff --check -- dist/crm/index.html` passes.
## 2026-08-25T08:34:30-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\18\rollout-2026-08-18T09-17-43-01a01573-280c-7c02-9c13-5c52c6dd3f67.jsonl
- Turn Id: 01a0394f-4e59-7bb3-9683-fb6f1807ca52
- Classification: valuable
- Information Type: Architecture
- Reason: durable implementation outcome
- Trigger Prompt Hash: b0664c28dbfd12b2

### Prompt Memory

Automation: Daily Mojo AI Summits Receipt Review
Automation ID: daily-mojo-ai-summits-receipt-review
Automation memory: $CODEX_HOME/automations/daily-mojo-ai-summits-receipt-review/memory.md
Review Mojo AI Summits budget receipts for the /budget profit-and-loss workflow. Work in C:\Users\scott\Code\aix. Use the existing Cloudflare/R2 storage configuration and local credentials only as needed, without printing secrets. Confirm the /budget API ingests all receipts under receipts/ as costs, create the daily receipt review snapshot if possible, and summarize new receipts, receipts missing dollar amounts, reviewed/reimbursed totals, and any errors that need Scott's attention. Mandatory completion

[Prompt excerpt truncated by Obsidianify.]

### Assistant Outcome

Implemented the duplicate merge behavior.

What changed:
- Existing “No event assigned” pre-invite rows now merge into the matching invited/registered row in the guest matrix display, carrying over notes, LinkedIn, title/company, interest rating, and potential sponsor.
- Creating a guest invite from a matrix-only pre-invite now sends the source prospect key to the API.
- The API now creates the invite, preserves the relevant pre-invite fields, updates CRM/contact data from that merged invite, and deletes the old pre-invite prospect record.
- Even if someone creates the invite manually, the API now tries to match an existing pre-invite by email, LinkedIn, or compact name like `Jeanne McClure, PhD` vs `Jeannemcclure`.

Verified:
- `node --check functions/api/crm.js`
- CRM inline script parse
- `git diff --check`
- `node scripts/check-website-analytics-privacy.mjs`

I did not deploy this yet.
## 2026-08-25T08:44:22-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\24\rollout-2026-08-24T15-37-57-01a035b5-6af2-7230-9fcf-774c4a79b202.jsonl
- Turn Id: 01a035b5-8e5f-7900-a9f6-e8c843621f63
- Classification: valuable
- Information Type: Architecture
- Reason: durable implementation outcome
- Trigger Prompt Hash: b0664c28dbfd12b2

### Prompt Memory

Automation: Daily Mojo AI Summits Receipt Review
Automation ID: daily-mojo-ai-summits-receipt-review
Automation memory: $CODEX_HOME/automations/daily-mojo-ai-summits-receipt-review/memory.md
Review Mojo AI Summits budget receipts for the /budget profit-and-loss workflow. Work in C:\Users\scott\Code\aix. Use the existing Cloudflare/R2 storage configuration and local credentials only as needed, without printing secrets. Confirm the /budget API ingests all receipts under receipts/ as costs, create the daily receipt review snapshot if possible, and summarize new receipts, receipts missing dollar amounts, reviewed/reimbursed totals, and any errors that need Scott's attention. Mandatory completion

[Prompt excerpt truncated by Obsidianify.]

### Assistant Outcome

Done. I added visible unique setup task references across:

[dist/setup/index.html](C:/Users/scott/Code/aix/dist/setup/index.html:1135): task rows now show IDs like `SETUP-001`, quick-add tasks get `SETUP-C-XXXX`, IDs are searchable, and CSV export includes a `Reference ID` column.

[dist/setup/calendar/index.html](C:/Users/scott/Code/aix/dist/setup/calendar/index.html:744): calendar chips and unscheduled items now show the same reference IDs.

[functions/api/setup-state.js](C:/Users/scott/Code/aix/functions/api/setup-state.js:9): shared custom setup items now preserve `refId`.

Validation passed:
`node --check functions/api/setup-state.js`
inline scripts parse for both setup pages
370 static setup task refs generated with 0 duplicates
`git diff --check` clean aside from existing CRLF warnings

Not deployed.
## 2026-08-25T08:44:58-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\18\rollout-2026-08-18T09-17-43-01a01573-280c-7c02-9c13-5c52c6dd3f67.jsonl
- Turn Id: 01a03955-4c3a-7781-9681-b8813581d7c8
- Classification: valuable
- Information Type: Architecture
- Reason: durable implementation outcome
- Trigger Prompt Hash: b0664c28dbfd12b2

### Prompt Memory

Automation: Daily Mojo AI Summits Receipt Review
Automation ID: daily-mojo-ai-summits-receipt-review
Automation memory: $CODEX_HOME/automations/daily-mojo-ai-summits-receipt-review/memory.md
Review Mojo AI Summits budget receipts for the /budget profit-and-loss workflow. Work in C:\Users\scott\Code\aix. Use the existing Cloudflare/R2 storage configuration and local credentials only as needed, without printing secrets. Confirm the /budget API ingests all receipts under receipts/ as costs, create the daily receipt review snapshot if possible, and summarize new receipts, receipts missing dollar amounts, reviewed/reimbursed totals, and any errors that need Scott's attention. Mandatory completion

[Prompt excerpt truncated by Obsidianify.]

### Assistant Outcome

Done. I added the `DaVinci` identity note to [AGENTS.md](C:/Users/scott/Code/aix/AGENTS.md:3).

I also fixed the registration reconciliation bug in [functions/api/crm.js](C:/Users/scott/Code/aix/functions/api/crm.js:4173). The CRM now treats someone as registered if any of these are true:

- there is a matching actual registration row
- there is a matching R2 invite-usage record
- the invite itself was already marked `used`

And matching by invite code is now code-first, so an email mismatch will not prevent a real registration from showing as registered. That should cover cases like Jeanne where we believe the registration happened but the guest matrix stayed stale.

Verified with:
- `node --check functions/api/crm.js`
- CRM inline script parse
- `git diff --check`
- `node scripts/check-website-analytics-privacy.mjs`

Not deployed yet.
## 2026-08-25T08:50:46-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Session Log: C:\Users\scott\.codex\sessions\2026\08\18\rollout-2026-08-18T09-17-43-01a01573-280c-7c02-9c13-5c52c6dd3f67.jsonl
- Turn Id: 01a0395c-db76-7d82-ba1b-aaf573cd8e3b
- Classification: valuable
- Information Type: Architecture
- Reason: durable implementation outcome
- Trigger Prompt Hash: b0664c28dbfd12b2

### Prompt Memory

Automation: Daily Mojo AI Summits Receipt Review
Automation ID: daily-mojo-ai-summits-receipt-review
Automation memory: $CODEX_HOME/automations/daily-mojo-ai-summits-receipt-review/memory.md
Review Mojo AI Summits budget receipts for the /budget profit-and-loss workflow. Work in C:\Users\scott\Code\aix. Use the existing Cloudflare/R2 storage configuration and local credentials only as needed, without printing secrets. Confirm the /budget API ingests all receipts under receipts/ as costs, create the daily receipt review snapshot if possible, and summarize new receipts, receipts missing dollar amounts, reviewed/reimbursed totals, and any errors that need Scott's attention. Mandatory completion

[Prompt excerpt truncated by Obsidianify.]

### Assistant Outcome

You were right, Scott. I was not giving you the actual audit feedback clearly enough.

Registration check result from what I can access:
- KV mirror has `1` guest invite, `1` member invite, `9` guest registrants, `1` member registrant.
- Jeanne / McClure / `arsinnovate` does **not** appear in the mirrored guest/member registrations, invites, or registration debug records.
- The visible mirrored guest registrations are old July records, mostly test registrations, and their stored `crmStatus` values are `new`.
- The deployed `/api/crm` endpoint returns `401` from this shell, and Cloudflare’s direct R2 object API rejected this token for object listing, so I cannot verify the browser-authenticated/R2-backed dataset from here.

I fixed the code anyway in the right place:
- Actual guest/member registrant records now normalize to `registered` even if old stored CRM status says `new`, `accepted`, `pending`, `confirmed`, or `invited`.
- Invite reconciliation now counts a person as registered if there is a matching registration row, an R2 invite-usage marker, or the invite itself is already marked `used`.

So: Jeanne is **not in the registration data I can audit from KV**, but the display/reconciliation bug that could cause registered people to show wrong is fixed locally. Not deployed yet.

Source note: I used Cloudflare’s R2 object-list API docs to confirm the direct R2 listing path: [Cloudflare R2 List Objects](https://developers.cloudflare.com/api/resources/r2/subresources/buckets/subresources/objects/methods/list/).
