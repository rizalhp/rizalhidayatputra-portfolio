# V19 Final Polish

V19 is the final refinement pass on top of V16–V18. It focuses on continuity, accessibility, compositor cleanup, and recruiter-facing navigation without changing the established art direction.

## Final changes

- Deep links such as `index.html#projects` and `index.html#contact` now bypass the cinematic welcome and land directly on the requested portfolio section.
- Added early deep-link handling to prevent a flash of the welcome screen when returning from project records.
- Added `inert` state management so hidden portfolio controls cannot receive keyboard focus behind the cinematic welcome.
- Prevented the generic anchor scroller from competing with the custom reversible welcome transition.
- Added outside-click, Escape, resize cleanup, and `aria-controls` support for mobile navigation.
- Released full-page `will-change` / transformed compositor layers after the portfolio transition finishes.
- Restored native overscroll behavior after the cinematic viewport lock is released.
- Added `scrollbar-gutter: stable` to reduce horizontal layout shift when scroll locking changes.
- Deferred contour artwork until idle / first cinematic interaction and skip it entirely for direct portfolio deep links.
- Disabled browser scroll restoration on the cinematic homepage so refresh/back behavior does not fight the managed intro state.
- Added Open Graph site/image metadata and JSON-LD structured data for the profile and project records.

## Intent

The visual design remains the same. V19 removes friction around the experience: the cinematic intro is preserved when entering from the homepage, while recruiter navigation between project records behaves like a normal fast portfolio.
