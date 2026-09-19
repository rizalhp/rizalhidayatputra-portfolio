# RizalHP Portfolio — Performance & Code Cleanup

## Runtime changes

- Split the homepage cinematic transition into `transition.js`.
- Reduced shared runtime to `common.js` for navigation, reveals, cursor, ambient particles, image protection, and the certification carousel.
- Project pages no longer execute the homepage scroll-scrub transition engine.
- Removed duplicate live transition painting and throttled the procedural transition animation.
- Reduced procedural transition geometry/dust density while preserving the same visual treatment.
- Changed the custom cursor from an always-running animation loop to an on-demand loop.
- Throttled ambient particles and lowered canvas pixel density on coarse/mobile pointers.

## Asset changes

- Added `assets/profile-emblem.webp` for headers and project loaders.
- Full-resolution `profile-artwork.webp` remains reserved for the welcome/hero scenes.
- Consolidated `styles.css` and the former `fixes.css` into one stylesheet request.

## Reliability / maintenance

- Project loader readiness is handled by the shared runtime with a fallback timeout.
- Corrected the welcome landmark semantics (it is not exposed as a modal dialog).
- Updated asset caching because production asset names are not content-hashed.
- Updated README with the new runtime structure.

## Validation performed

- JavaScript syntax checks passed for `common.js` and `transition.js`.
- CSS parsed with zero syntax errors.
- Local HTML asset/link references were checked; no missing local files were found.
- Duplicate HTML IDs were checked; none were found.


## Stage 2 — Performance polish
- Added adaptive procedural-transition quality tiers based on viewport, pointer type, CPU threads, and available device memory.
- Reduced transition canvas DPR on constrained/high-density devices while keeping CSS dimensions unchanged.
- Removed a forced layout read (`offsetHeight`) from the 60fps intro-progress path.
- Cached the procedural canvas 2D context instead of reacquiring it on every paint.
- Reduced procedural density while preserving the same erosion-band composition and visual hierarchy.
- Added visibility pausing for the transition animation loop.
- RAF-debounced transition, particle, and carousel resize work.
- Cached the particle radial glow so it is no longer rebuilt every animation frame.
- Reduced ambient-particle density/DPR on project pages where the effect is secondary.
- Added paint/layout containment to heavy project visual blocks and transition canvases.
- Removed a duplicated canvas shadow assignment.
- Suspended the ambient particle loop while the full-screen welcome/transition owns the viewport, preventing invisible background work from competing with the cinematic canvas.

## Stage 3 — V18 device-aware fine tuning
- Memoized deterministic seeded noise used by the procedural erosion field.
- Added active-vs-idle transition frame pacing to reduce work when the user pauses mid-scrub.
- Stabilized mobile viewport resize handling to avoid address-bar resize storms.
- Cached hero geometry for parallax so pointer movement no longer triggers repeated layout reads.
- Switched ambient particles from per-frame shadowBlur paths to reusable sprite rendering.
- Added performance-tier CSS fallbacks for constrained/mobile devices.
- Added content-visibility to deep below-fold sections to reduce initial layout and paint cost.
- Reduced mobile grain compositing pressure.
- Removed local `.vercel` deployment metadata from the distributable build.


## V19 — Final Polish

- Deep-link continuity from project records to portfolio sections.
- Keyboard interaction isolation via `inert` during cinematic states.
- Compositor cleanup after transition completion.
- Final mobile navigation interaction cleanup.
- Deferred contour asset loading for non-cinematic routes.
- Structured metadata and final SEO/accessibility polish.
