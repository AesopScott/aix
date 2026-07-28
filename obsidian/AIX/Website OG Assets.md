# Website OG Assets

## Home Page

The home page uses a dedicated OG image URL so stale social preview caches do not keep serving an older shared asset.

- Home meta image: `https://mojoaisummits.com/assets/og-home-executive-ai-v2.png`
- Local file: `C:\Users\scott\Code\aix\dist\assets\og-home-executive-ai-v2.png`
- Current visual message: `Where executive leaders shape the future of AI`

Do not point the home page back at the generic `assets/og-image.png` unless intentionally replacing the shared OG strategy. If social platforms show an older image such as `Where AI Leaders Meet, Learn, and Build`, use a new image filename and redeploy so crawlers see a fresh URL. If a new image URL is requested before Cloudflare has deployed the file, Cloudflare may cache an HTML fallback at that PNG path; in that case, use a fresh filename and deploy again.
