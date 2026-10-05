# Live Miracle

Official GitHub Pages site: https://vimplayapi-cpu.github.io/

The white, gold and oxblood design uses the supplied transparent Live Miracle artwork. Studio media, business details and all existing routes are retained. Logo motion and hero scroll effects respect reduced-motion preferences, with lower-resolution frames on mobile and a static poster for reduced motion. The hero scrubs the original 96-frame walkthrough; the About diagrams use raised, high-contrast gold and burgundy controls.

## Rebuild

Source is in `app-source/`. Install with `npm ci`, copy the root `media/` folder to `app-source/public/media/`, then run `node --import tsx scripts/seed.ts` to create a local build database. Do not commit the database or generated credentials. Set `LM_SITE_URL=https://vimplayapi-cpu.github.io` and `LM_BASE_PATH=''`, then run `node --import tsx scripts/build-static.ts`. Copy `app-source/out/` into the repository root, retaining `.nojekyll`.

The optimized original photography is kept in `media/`; existing walkthrough frames remain in `frames/`. GitHub Pages is a static host. Contact/demo forms retain the email fallback; admin/API features require the separate Node application.
