# Website OG Assets

## Home Page

The home page uses a cache-busted OG image URL so stale social preview caches do not keep serving an older shared asset.

- Home meta image: `https://mojoaisummits.com/assets/og-image.png?v=20260727b`
- Local file: `C:\Users\scott\Code\aix\dist\assets\og-image.png`
- Current visual message: `Where executive leaders shape the future of AI`

The query string is intentional. Cloudflare was serving the existing `assets/og-image.png` path correctly as `image/png`, while newly added OG alias filenames were falling through to the home page HTML. If social platforms show an older image such as `Where AI Leaders Meet, Learn, and Build`, update the cache-busting version on the existing image URL and redeploy.

## Member Registration

The member registration page uses a dedicated OG image that does not expose any invite code.

- Member registration meta image: `https://mojoaisummits.com/assets/og-member-registration.png`
- Local file: `C:\Users\scott\Code\aix\dist\assets\og-member-registration.png`
- Page route: `https://mojoaisummits.com/member-registration/`
- Current visual message: `Member Registration`

## Guest Registration

The guest registration page uses a dedicated OG image that does not expose any invite code.

- Guest registration meta image: `https://mojoaisummits.com/assets/og-guest-registration.png`
- Local file: `C:\Users\scott\Code\aix\dist\assets\og-guest-registration.png`
- Page route: `https://mojoaisummits.com/guest/`
- Current visual message: `Guest Registration`
