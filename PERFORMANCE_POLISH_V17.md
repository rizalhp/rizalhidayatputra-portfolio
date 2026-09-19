# Performance Polish — v17

This pass keeps the existing visual direction while reducing runtime work.

## Main changes
- Adaptive procedural transition quality tiers (`lite`, `balanced`, `full`).
- Lower transition canvas DPR on constrained devices.
- Reduced procedural particle/fragment density without changing composition.
- Removed forced layout reads from the intro animation hot path.
- Cached the transition canvas context and ambient radial glow.
- Suspended ambient background particles while the full-screen intro is active.
- Paused animation work while the document is hidden.
- RAF-debounced resize work for transition, particles, and credential carousel.
- Lower ambient particle load on project-detail pages.
- Mobile desaturation uses a lighter blend-based treatment instead of a full-screen backdrop filter.
- Paint/layout containment added to expensive isolated visual regions.

## Validation
- JavaScript syntax: passed.
- CSS parser: 0 errors.
- Local HTML references: 0 missing.
- Duplicate ID scan: passed.

Automated Chromium screenshot verification was unavailable in the execution environment because the installed browser could not initialize headless mode, so final visual verification should still be done in a normal browser on desktop and mobile.
