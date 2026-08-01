# Registration and Invite Walkthrough Reviews

Updated: 2026-08-01

Durable summary: Created a consolidated walkthrough review for guest registration, member registration, member profile access, partner candidate registration, partner registration, partner profile access, staff-created invite links, member-created invite links, and member copy/send behavior.

Primary artifact: `docs/processes/registration-profile-user-stories-walkthrough-reviews.md`

HTML route: `/walkthrough/`

Key decisions captured:

- Treat partner candidate registration as the `/partners/` partner subscription request, not the private partner registration flow.
- Treat member invite sending as the current copy-and-send external workflow because there is no in-app email or SMS send action for member-created links.
- Note that staff-created invite links are event-tied, while member-created guest/member links currently do not require event selection.
- Preserve the production CRM ambiguity from the existing handoff as a review risk for team-created links.
- Added a tabbed static walkthrough review page at `/walkthrough/`, classified as a Mojo team route in access-control defaults.

Next useful pass:

- Run an end-to-end QA pass with one staff guest invite, one staff member invite, one staff partner invite, one member-created guest link, and one member-created member nomination link.
