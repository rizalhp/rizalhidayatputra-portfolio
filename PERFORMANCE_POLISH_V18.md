# Performance Polish V18

V18 focuses on per-device frame stability and distribution hygiene while preserving the V17 visual direction.

## Transition runtime

- Memoized deterministic seeded noise values used by the procedural erosion field, avoiding repeated trigonometric work for static seeds.
- Reduced procedural quality multipliers slightly per performance tier while retaining the same erosion-band composition.
- Added adaptive idle frame pacing: the transition renders at a higher cadence while the user is actively scrolling/clicking and automatically drops to a calmer cadence when paused mid-transition.
- Added explicit performance-tier metadata on the document for CSS fallbacks.
- Ignored small mobile browser-chrome-only resize events so Safari/Chrome mobile address-bar changes do not repeatedly rebuild the cinematic geometry.
- Added orientation-specific full refresh after the viewport settles.

## Shared runtime

- Cached the hero bounding rectangle so mouse parallax no longer performs a layout read on every pointer event.
- Replaced per-particle `shadowBlur` drawing with reusable pre-rendered dust/ember sprites.
- Reduced ambient canvas DPR slightly and stabilized canvas resizing on coarse-pointer devices.
- Added orientation-aware particle-canvas refresh.

## CSS / rendering

- Added a lighter desaturation fallback for the `lite` performance tier, avoiding a large backdrop-filter surface on constrained/mobile GPUs.
- Added `content-visibility: auto` to deep below-fold homepage/project sections with intrinsic placeholders to reduce initial layout and paint work.
- Reduced mobile full-screen grain compositing cost while preserving the texture.
- Removed unnecessary procedural-canvas `will-change: contents` promotion.

## Distribution hygiene

- Removed the local `.vercel` metadata directory from the distributable build.
- `.gitignore` continues to exclude `.vercel` and `.env*`.

## Validation

- JavaScript syntax checks passed for `common.js` and `transition.js`.
- CSS braces are balanced.
- All local HTML asset/script/stylesheet links resolve.
- No duplicate HTML IDs were found.
- All five HTML pages respond successfully through a local static server.
