# Rizal Hidayat Putra — Aspik Portfolio

Static recruiter-facing portfolio with a dark Victorian / modern data-tech visual language.

## Quick links

- [Live portfolio](https://rizalhp-dev.vercel.app/)
- [Development progress](./daily-progress/)

## Selected case studies

- [Airline operations analytics](https://rizalhp-dev.vercel.app/project-airline.html) — airline reliability, cancellations, and delay patterns.
- [E-commerce sales performance](https://rizalhp-dev.vercel.app/project-ecommerce.html) — analysis of more than one million retail transactions; [explore the Tableau dashboard](https://public.tableau.com/app/profile/rizal.hidayat.putra/viz/E-commerceSalesPerformanceDashboard_17839484720630/CustomerSegmentation).
- [Kang Parkir Simulator](https://rizalhp-dev.vercel.app/project-kang-parkir.html) — Roblox parking simulator with progression and social competition systems.
- [Hybrid CNN–GRU suicide detection research](https://rizalhp-dev.vercel.app/project-research.html) — NLP research with feature expansion and enhancement; [read the published paper](https://doi.org/10.1109/ICITCOM66635.2025.11265431).

## Current build
- Scroll-triggered reversible welcome ↔ portfolio transition
- Grey/white contour-mosaic dissolve matched to the supplied reference recording
- Mouse parallax hero and ambient particles
- Responsive navigation + active section state
- Selectable/copyable text
- Image drag + image context-menu protection only
- One-time viewport reveal animations (content stays visible after reveal)
- Selected project case studies with external proof links
- Downloadable CV
- Professional contact links (Email, LinkedIn, GitHub, Tableau Public)
- WebP image optimization + lazy loading and intrinsic image dimensions
- Open Graph / Twitter Card metadata, canonical URLs, favicon, sitemap, and robots.txt
- Vercel cache and basic security headers
- Reduced-motion support and visible keyboard focus states

## Local preview
```bash
python3 -m http.server 8000
```
Open `http://localhost:8000`.

## Security
Do not commit or share `.env*` files. They are ignored by `.gitignore` and are not included in the distributable ZIP.

## Runtime structure

- `styles.css` — consolidated visual system and responsive enhancements
- `common.js` — shared navigation, reveals, cursor, particles, and carousel behavior
- `transition.js` — homepage-only cinematic welcome transition
- `assets/profile-emblem.webp` — lightweight header/loader artwork; full-resolution profile art is reserved for hero scenes

## Performance notes

The cinematic transition uses a reduced-density procedural field and throttled animation loop. Project detail pages do not load the homepage transition engine. Asset caching uses revalidation because production filenames are not content-hashed.
