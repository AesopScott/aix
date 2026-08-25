# Zoom Booking Hosts

## 2026-08-17

The employee scheduling backend now supports per-employee Zoom host routing through `zoomUserId` on scheduling employee profiles.

- Angel default host: `angel@mojoaisummits.com`; Zoom meeting create/delete validation succeeded.
- Miller default host: `miller@mojoaisummits.com`; Zoom returned user-not-found. Common variants `miller.freeman@mojoaisummits.com`, `millerfreeman@mojoaisummits.com`, and `mfreeman@mojoaisummits.com` also returned user-not-found.
- The Zoom API app can create meetings but cannot list account users because it lacks the Zoom `user:read:list_users:admin` scope.

Next step: confirm Miller's actual Zoom user email in Zoom admin or add the user/invite under `miller@mojoaisummits.com`, then save that value in `/schedule-admin/` as the Zoom Host Email/User ID.
