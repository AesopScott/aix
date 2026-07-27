# CRM VIP Invite Links

## Current Behavior

- The Cloudflare-native CRM at `/crm` generates full VIP registration links instead of operator-facing raw codes.
- Each generated link points to `https://mojoaisummits.com/vip-registration/?invite=######`.
- The six-digit value remains the internal invite ID stored in D1.
- VIP invite links expire 48 hours after creation.
- Expired links are rejected by the public validation and VIP registration endpoints with a message asking the invitee to request a new link.
- Available, expired, used, and disabled link states are visible in the CRM invite-links view.

## Deployment

- Implemented in `AesopScott/open-crm`.
- Deployed through Wrangler to the `mojoaisummits.com/crm` Worker route.
- Live smoke test verified valid-link validation, expiry response, and cleanup of generated smoke-test links.

## Operational Note

Generate VIP invite links from the CRM Invite links page before sending a VIP to registration. If a VIP waits more than 48 hours, generate and send a new link.
