# CRM Event Invite Links

## Current Behavior

- The Cloudflare-native CRM at `/crm` generates full guest, member, and partner registration links instead of operator-facing raw codes.
- Staff select an upcoming event page before generating a code.
- Guest links point to `https://mojoaisummits.com/guest/?invite=######`.
- Member links point to `https://mojoaisummits.com/member-registration/?invite=######`.
- Partner links point to `https://mojoaisummits.com/partner-registration/?invite=######`.
- The six-digit value remains the internal invite ID stored in `MOJO_SUMMITS_SETUP_STATE`.
- Guest/member invite records store `eventSlug`, `eventName`, and `eventDate` under `crm:guest-invite-code:######` or `crm:member-invite-code:######`.
- Partner invite records store the same event metadata plus partner context under `crm:partner-invite-code:######`.
- Successful registrations copy event metadata from the invite code into the CRM registrant record.
- Generated event pages show an Event registrants section for member, guest, and partner records tied to that event.
- CRM invite rows can be deleted. Member profile invite rows can also be deleted by the member who generated them.
- Used invite rows should display `Used by` with the registrant name when available and `Used for` with the event name/date, rather than only showing a binary used status.

## Deployment

- Implemented in the AIX Pages Functions and static CRM/event pages.
- Deploy through the repository `Deploy` workflow to Cloudflare Pages.

## Operational Note

Create the event page first in `/events/`, then create the registration invite in `/crm/` so the code can be tied to the event. Use the copied full URL when sending invitations.
