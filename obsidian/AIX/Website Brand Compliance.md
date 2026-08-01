# Website Brand Compliance

Updated: 2026-08-01

## Summary

The deployed static site now uses a central brand-compliance layer at `dist/assets/mojo-brand-compliance.css`.

The layer enforces the Mojo AI Summits brand guide across deployed `dist` pages:

- Montserrat typography for headlines, body copy, labels, and UI.
- Approved brand palette: Deep Navy `#0A0F1E`, Electric Blue `#1666FF`, Cyan `#00E6FF`, Slate `#1B2333`, and White `#FFFFFF`.
- Uppercase headline and UI-label treatment.
- Approved logo asset usage and replacement of old champagne/gold mockup image references.
- Mobile guardrails for dense grids, forms, and tables so pages do not widen past the viewport.

## Verification

Rendered audit on 2026-08-01 checked 40 routes at desktop and mobile viewport sizes, 80 checks total.

Result: 0 failures for brand stylesheet presence, Montserrat usage, legacy `MoJo` or `Ai` casing, old gold/champagne assets, sampled off-brand computed colors, and horizontal overflow.

The hidden partner-registration route was checked with `?preview=4321`, matching its administrative preview behavior.
