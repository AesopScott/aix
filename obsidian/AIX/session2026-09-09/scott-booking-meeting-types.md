# Scott Booking Meeting Types

Date: 2026-09-09

Scott clarified that the relevant booking calendar is `scott@mojoaisummits.com`; Aesop Academy calendar data is out of scope for this booking-agent issue.

Production update:

- Updated the `scheduling:employee:scott` record in the `mojo-ai-summits-crm` D1 database.
- Added a second meeting type with id `intro-60`.
- The existing `intro` meeting type remains a 30-minute intro call.
- The new `intro-60` meeting type uses the same label, description, and Zoom location, with `durationMinutes` set to `60`.

Verification:

- Public `/api/scheduling/team` now returns two Scott meeting types: `intro` at 30 minutes and `intro-60` at 60 minutes.
- Public `/api/scheduling/availability?host=scott&type=intro-60&date=2026-09-10` returns one-hour slots.

Deployment:

- This repository deployment records the booking-profile change and product version bump; the functional booking update was already applied to production D1 before deployment.
