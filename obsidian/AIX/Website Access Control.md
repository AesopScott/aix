# Website Access Control

Updated: 2026-07-30

The AIX site uses Mojo app-session authentication for access administration at `/access/`.

Current state:
- Global access control remains disabled, so public pages and APIs stay freely accessible until access control is explicitly enabled.
- The first owner invite flow creates the initial owner account for `scott@mojoaisummits.com`.
- The temporary bootstrap secret was used only to create the first owner invite and then removed from Cloudflare Pages.
- The Create Account flow now shows inline validation and submission feedback instead of relying on native browser validation.
- Access policy now uses three starter groups: `Public`, `Admin`, and `Mojo team`.
- Routes/pages/APIs are assigned to groups, and group email membership determines which non-admin users can access protected routes.
- `/access/` and `/api/auth/*` must remain public so unauthenticated users can reach sign-in, accept invites, and avoid nested `next=/access/` redirect loops.
- Route discovery is manual: the Access page `Refresh Routes` button reads the Company Hub (`/admin/`) and adds missing page links as controllable discovered routes.
- The default access route table now includes `/membership/`, `/fellowships/`, `/partners/`, `/partner-registration/`, `/files/`, `/api/virtual-events/*`, `/api/partner-registration`, and `/crm/api/public/partner-*` so new public, partner, and storage routes do not depend on the discovery cache.
- `Admin` and `owner` roles can manage the access console and bypass protected-route group lists; `member` accounts depend on group membership.
- The account creation UI now asks for access groups (`Admin` and/or `Mojo team`) instead of exposing raw `member/admin/owner` role choices.
- Access group cards show visible membership lists with account status, backed by the editable group email lists.

Operational note:
- Owner/admin users should create additional accounts from `/access/` after the first owner signs in.
- Add users to `Admin` or `Mojo team` from the account form or by editing the group email lists in `/access/`, then assign each route to the intended group.
- Do not store bootstrap tokens, passwords, invite tokens, or recovery material in the repo or Obsidian.
