# Aurelia House — Full-page scrollytelling landing page

A vanilla HTML/CSS/JS luxury real-estate landing page built around an Apple AirPods-style scroll sequence. The cinematic villa approach is not limited to the hero copy: the sticky canvas occupies the first scroll chapter, then the page continues into editorial residence, details, setting, amenities and inquiry sections. The same scroll progress drives the headline, access-granted state, CTA and scroll hint.

## Run locally

Serve the folder over HTTP so the browser can fetch WebP frames and `frames/manifest.json`:

```bash
python3 -m http.server 4173
# open http://localhost:4173
```

Place the source video at `src/hero.mp4`. The page can open without frames so the layout can be reviewed, but the cinematic canvas becomes active after extraction.

## Regenerate the frame sequence

The script uses `ffmpeg` to create two WebP sets from the same source video. It keeps the video at 30fps, produces 1920px desktop frames and 960px mobile frames, uses quality 75, and writes a manifest consumed by `script.js`.

```bash
chmod +x scripts/extract-frames.sh
./scripts/extract-frames.sh ./src/hero.mp4
```

Optional tuning variables are available without editing the script:

```bash
FPS=30 QUALITY=75 ./scripts/extract-frames.sh ./src/hero.mp4 ./frames
```

The output is:

```text
frames/
  manifest.json
  1920w/frame_0001.webp ... frame_N.webp
  960w/frame_0001.webp  ... frame_N.webp
```

`manifest.json` stores `frameCount`, `fps`, source dimensions and the two set names. The page’s scroll length is derived from `frameCount * frameStep`; change `frameStep` near the top of `script.js` to make the sequence feel shorter or more spacious. The default is 12px per frame.

## Loading and performance behavior

The hero initializes only when it is close to the viewport. It loads and decodes frame 1 first, renders that frame immediately, and then preloads the rest in small batches while showing progress. A frame is never drawn until it has successfully decoded; if the requested frame is missing or still loading, the last good frame remains visible.

`createImageBitmap` is used where supported. Decoded frames outside a sliding window are closed and released once the sequence grows beyond the configured memory budget. On screens below 768px, the 960px set is selected and every other source frame is used, giving an effective 15fps scrub. On `prefers-reduced-motion: reduce`, the sticky sequence is replaced by a static first-frame hero with normal page flow and no scroll-driven motion.

## Content and visual system

The page uses a dark forest, limestone and aged-bronze palette with a serif display face, restrained mono labels and generous editorial spacing. The image panels in the later sections are CSS placeholders so the full page remains visually complete before supporting stills are supplied. Replace the `.image-*` backgrounds in `style.css` with final property photography when available.

The inquiry CTA is intentionally a mailto link so it works without a backend. Replace it with a form endpoint or CRM action when the property workflow is ready.
