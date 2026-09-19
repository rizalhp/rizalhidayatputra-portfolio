# V19.1 — Welcome Auto-Entry Fix

- Forward scrolling now controls only the welcome portion of the cinematic.
- At 50% timeline progress, the Portfolio Introduction automatically eases into the main portfolio.
- Same-direction trackpad/touch/keyboard momentum is ignored while the auto-finish is running, preventing the animation from being cancelled by residual input.
- An intentional reverse gesture can still interrupt the auto-finish and move back toward the welcome screen.
- The existing reverse transition from the top of the portfolio remains available.

This patch removes the brief "stuck" feeling on the Portfolio Introduction screen while preserving the cinematic transition and reversible navigation.
