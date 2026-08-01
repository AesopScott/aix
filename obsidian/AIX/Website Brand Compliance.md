# Website Brand Compliance

Updated: 2026-08-01

## Summary

The previous central brand-compliance layer at `dist/assets/mojo-brand-compliance.css` was made intentionally non-invasive on 2026-08-01.

Do not use a global CSS override to force Montserrat, all-caps headings, hero sizing, nav styles, colors, layout, or responsive behavior across the site. That approach damaged authored page art direction, especially the homepage and partners page.

Brand guidance should be applied directly in page designs and visual assets while preserving each page's existing typography and composition unless Scott explicitly asks for a page redesign.

## Verification

Rendered audit on 2026-08-01 confirmed the homepage and partners page hero headings were restored to authored typography:

- Homepage H1: `Fraunces, serif`, no forced uppercase transform.
- Partners H1: `Fraunces, serif`, no forced uppercase transform.
- Brand/nav text: authored page fonts restored.
