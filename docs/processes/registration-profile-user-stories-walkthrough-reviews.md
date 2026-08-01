# Registration, Profile, and Invite Walkthrough Reviews

Updated: 2026-08-01

This review covers the public registration paths, private profile access paths, and invite-link creation paths currently implemented in the AIX site.

HTML implementation: `/walkthrough/`

## Source Surfaces

- Public pages: `/guest/`, `/member-registration/`, `/partners/`, `/partner-registration/`
- Private pages: `/member-profile/`, `/partner-profile/`, `/crm/`
- APIs: `/api/guest-registration`, `/api/member-registration`, `/api/partner-registration`, `/api/invite-request`, `/api/member-profile`, `/api/partner-profile`, `/api/crm`
- Invite validation APIs: `/api/guest-invite-codes/:code`, `/api/member-invite-codes/:code`, `/api/partner-invite-codes/:code`

## Shared Review Standards

- All registration forms require name, company, title, industry where present, company email, phone, phone verification status, and a six-digit invite code except partner candidate requests.
- Gmail and Googlemail addresses are rejected for guest, member, and partner registration.
- Successful guest, member, and partner registrations create registration records, canonical CRM contacts, event history entries, and company rollups.
- Invite links should show event context, used status, `Used by`, and `Used for` wherever the reviewing UI lists them.
- Preview modes must never submit live data.
- Temporary passwords, invite tokens, and handoff credentials must not be written into docs, notes, chat, commits, or logs.

## 1. Guest Registration

**User story**

As an invited executive guest, I want to open a Mojo guest registration link and submit my company details so the Mojo team can confirm my seat for the correct event.

**Primary walkthrough**

1. A Mojo team member or accepted member creates a guest invite link.
2. The guest opens `/guest/?invite=######`.
3. The page validates the code with `/api/guest-invite-codes/:code`.
4. The guest enters full name, company, title, industry, company email, mobile phone, and publication-use choices.
5. The guest records phone confirmation. While SMS is not fully configured, guest registration normalizes unverified/code-sent states to `pending_sms_setup`.
6. The guest submits to `/api/guest-registration`.
7. The system stores the registration, marks stored invite usage, upserts the CRM contact, and ties the contact event history to the invite event when metadata exists.
8. The guest sees the registration received confirmation.

**Walkthrough review checks**

- Direct `/guest/` visit can display the page, but submit requires a valid six-digit invite.
- Invalid, expired, revoked, used, or wrong-type invite codes show a blocking error.
- Gmail and Googlemail addresses are rejected before and during submit.
- Event metadata from stored invite codes appears in CRM contacts and event registrant lists.
- Used invite rows show the registrant under `Used by` and the assigned event under `Used for`.

## 2. Member Registration

**User story**

As an invited prospective member, I want to unlock member registration with my six-digit nomination code so I can submit the details needed for membership review.

**Primary walkthrough**

1. A Mojo team member or accepted member creates a member invite link.
2. The prospective member opens `/member-registration/?invite=######` or enters the code into the gate.
3. The page validates the code with `/api/member-invite-codes/:code`.
4. The page unlocks the member details form after code validation.
5. The prospective member enters name, company, title, industry, company email, mobile phone, and publication-use choices.
6. The prospective member starts phone verification. If SMS is not fully configured, the expected submit-ready state is `pending_sms_setup`; if SMS is configured, the code must be confirmed as `verified`.
7. The form submits to `/api/member-registration`.
8. The system stores the registration, upserts the CRM contact, records event history, and marks the invite as used when it was a stored code.

**Walkthrough review checks**

- The access gate blocks the form until a valid code is provided.
- The `MOJO_MEMBER_INVITE_CODES_STRICT=true` environment setting requires stored active member codes, not just any six-digit value.
- The frontend blocks submission when phone status is `unverified` or `code_sent`.
- A used member nomination link cannot unlock a second registration.
- The CRM member row remains reviewable until staff accepts it and generates member access credentials.

## 3. Member Profile Access

**User story**

As an accepted member, I want to sign in to my member profile so I can see my standing, directory access, invite links, fellowship activity, and Mojo contacts.

**Primary walkthrough**

1. Staff reviews a member registrant in `/crm/`.
2. Staff marks or keeps the member as accepted, selects a member tier, and uses Generate Password or Reset Password.
3. The member signs in at `/member-profile/` with the CRM registration email and the provided Mojo password.
4. The page calls `/api/auth/login`, then `/api/member-profile`.
5. The API confirms the signed-in account maps to an accepted member registration.
6. The profile displays tier, contact details, impact metrics, invite history, accepted member directory, Discord/member channels, staff contacts, and fellowship status.
7. The member can update fellowship nomination preference, create invite links, delete their own invite links, nominate eligible members for fellowship promotion during open windows, and vote on open nominations.

**Walkthrough review checks**

- Active Mojo login without an accepted member registration returns a profile access error.
- `/member-profile/?preview=4321` shows sample review data and blocks live submissions.
- Generated profile links use the member registration email as the login identity.
- Member-owned invite deletion cannot delete links generated by another member.
- Logout clears the session and returns the user to the login panel.

## 4. Partner Candidate Registration

**User story**

As a vendor leader exploring partnership fit, I want to request partner subscription information so Mojo can create a Partner Candidate contact and route the request to the team.

**Primary walkthrough**

1. The candidate opens `/partners/`.
2. The candidate selects `Request partner subscription information`.
3. The modal collects name, email, phone, company, title, and source page.
4. The page posts to `/api/invite-request` with `type: partner-subscription`.
5. The API validates the request, stores `invite-request:*`, upserts a canonical contact, writes the company rollup as `Partner Candidate`, and notifies the configured Mojo recipients.
6. The candidate sees the thank-you state.

**Walkthrough review checks**

- Phone is required for partner subscription requests.
- Candidate creation does not make the company an approved Partner.
- Candidate creation does not create a partner profile login by itself.
- If notification email fails, the request can still be saved, but the UI receives an error that should be triaged.
- The CRM contact should show `Partner Candidate` status and a partner subscription request event.

## 5. Partner Registration

**User story**

As an invited partner contact, I want to open a private partner registration link so Mojo can connect my company, event participation, and future partner profile access.

**Primary walkthrough**

1. A Mojo team member creates a partner invite in `/crm/`.
2. The partner contact opens `/partner-registration/?invite=######`.
3. The page validates the code with `/api/partner-invite-codes/:code`.
4. The private form unlocks and displays invite/event context.
5. The partner enters name, company, title, industry, company email, mobile phone, and publication-use choices.
6. The partner records phone confirmation as `verified` or `pending_sms_setup`.
7. The form submits to `/api/partner-registration`.
8. The system stores the registration, marks invite usage, upserts the canonical contact, and connects the contact to a company-level partner profile key.

**Walkthrough review checks**

- Direct `/partner-registration/` shows the private-link gate and does not reveal the form.
- Partner invite codes are strict: a stored active partner code is required.
- `/partner-registration/?preview=4321` unlocks the form for review but blocks live submission.
- Gmail and Googlemail addresses are rejected.
- The partner company, contact email, partner tier, and selected event from the invite are preserved on the registration record.

## 6. Partner Profile Access

**User story**

As a partner contact, I want to access my company-level partner profile so I can see contacts, events, attendee relationships, publications, subscriptions, and executive slots.

**Primary walkthrough**

1. Staff reviews the partner registration in `/crm/`.
2. Staff uses Generate Password or Reset Password on the partner registrant.
3. The generated Mojo Auth account uses the CRM registration email and is added to the `partners` access group.
4. The partner opens `/partner-profile/`.
5. If not signed in, the page routes the partner to `/access/?next=/partner-profile/`.
6. After sign-in, `/api/partner-profile` resolves the signed-in contact to a company-level partner profile through CRM contact and company records.
7. The page displays company tier, contacts, events, attendees visible from those events, publications, subscription payments, and executive slots.

**Walkthrough review checks**

- Partner profiles are company-based, not individual-user-based.
- Signed-in accounts with no connected partner company receive a profile access error.
- `/partner-profile/?preview=4321` shows sample company data without live data.
- Inferred profiles should show a notice until enriched company profile records exist.
- Partner profile access depends on route policy and the user's access group when access control is enabled.

## 7. Creating Invite Links as a Mojo AI Summits Team Member

**User story**

As a Mojo AI Summits team member, I want to create event-tied guest, member, and partner invite links from CRM so each registration inherits the correct event context.

**Primary walkthrough**

1. Staff signs in with the required CRM access and opens `/crm/`.
2. Staff confirms the target event page exists or uses the fallback event list.
3. For guest/member links, staff opens `Create Guest Invite Links`, chooses invite type, chooses event, optionally enters invitee name, and generates the link.
4. For partner links, staff opens `Guest Partner Invite Links`, chooses event, enters partner company, partner contact email, and tier, then generates the link.
5. The CRM creates a six-digit code, stores the invite metadata in KV, renders the full URL, displays a QR code, and attempts clipboard copy.
6. Staff sends the full URL or QR code to the invitee using the appropriate external channel.

**Walkthrough review checks**

- Invite generation should fail without an event.
- The generated URL path must match the invite type: `/guest/`, `/member-registration/`, or `/partner-registration/`.
- The invite list should show active/used status, QR download, copy, delete, `Used by`, and `Used for`.
- Deleting an invite should remove only the intended invite code.
- The protected live CRM deployment should be verified because a prior handoff noted that the apex `/crm/` route may be served by a different CRM application.

## 8. Creating Member Invite Links as a Member

**User story**

As an accepted member, I want to create guest show links and new-member nomination links from my member profile so I can thoughtfully bring executives into the Mojo network.

**Primary walkthrough**

1. The accepted member signs in at `/member-profile/`.
2. The member navigates to `Invites`.
3. For a guest show invite, the member enters optional guest name and guest email, then selects `Create Guest Link`.
4. For a member nomination, the member enters nominee name, email, company, title, and a nomination note, then selects `Create Member Link`.
5. The page posts to `/api/member-profile` with `create-guest-invite` or `create-member-nomination`.
6. The API stores a member-owned invite code with the creator's member email, name, and tier.
7. The page copies the generated link when clipboard access is available and refreshes invite history.

**Walkthrough review checks**

- Only accepted signed-in members can create member-powered links.
- Member nomination links are limited to two per member per month.
- Guest show links do not currently require event selection in the member profile flow, so event context may be blank unless the UI is extended.
- Invite history should show link type, status, URL, copy action, delete action, `Used by`, and `Used for`.
- Preview mode cannot create live invite links.

## 9. Sending In Member Invite Links as a Member

**User story**

As an accepted member who created a member nomination link, I want to send the generated link to the nominee so they can complete member registration and the nomination can be reviewed.

**Primary walkthrough**

1. The member creates a member nomination link in `/member-profile/`.
2. The member copies the generated `/member-registration/?invite=######` URL from the success notice or invite history.
3. The member sends the URL through an external channel such as email, text, LinkedIn, or direct message.
4. The nominee opens the URL and completes the Member Registration walkthrough.
5. The invite row moves to used state after successful registration.
6. The member and staff can review invite history with `Used by` and `Used for` values.

**Walkthrough review checks**

- The product currently creates and copies links; it does not send member invites through an in-app email or SMS workflow.
- The copied URL should include the full origin and `/member-registration/?invite=######`.
- Members should not be able to reuse used nomination links for multiple nominees.
- Staff should be able to connect the resulting member registrant to the original nominating member through invite metadata.
- A future in-app send flow should add delivery audit state without exposing invite tokens in logs.

## Cross-Workflow Open Questions

- Should member-created guest and member links require event selection, matching CRM-created links?
- Should partner candidate requests reject personal email domains, matching partner registration?
- Should the member profile include an explicit send workflow, or is copy-and-send externally the intended product behavior?
- Should guest registration require phone verification before submit once SMS is fully configured, matching member and partner behavior?
- Which CRM implementation is authoritative on the production apex route `/crm/`?

## Suggested QA Pass

1. Create one staff guest invite, one staff member invite, and one staff partner invite tied to a known event.
2. Complete each registration with a unique company email.
3. Confirm CRM invite history, contacts, company rollups, and event registrant rosters.
4. Accept the member and partner registrants, generate passwords, and confirm private profile access.
5. From the accepted member profile, create a guest show link and a member nomination link.
6. Use the member nomination link to complete another member registration and verify the two-per-month limit.
7. Verify invalid, used, wrong-type, direct-route, and preview-mode cases for every route.
