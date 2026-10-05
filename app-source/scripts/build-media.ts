/**
 * Derivative pipeline for the supplied studio photography.
 *
 * Source masters live in assets/source/studios (committed). This script emits
 * responsive AVIF + WebP derivatives into public/media/studios (gitignored) and
 * writes src/generated/media-manifest.json describing every derived asset,
 * including an LQIP data URI and the dominant colour used as each studio's
 * accent. Runs automatically via the `prebuild` npm lifecycle hook.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE_DIR = path.join(ROOT, 'assets/source/studios');
const OUT_DIR = path.join(ROOT, 'public/media/studios');
const MANIFEST = path.join(ROOT, 'src/generated/media-manifest.json');

/** Widths emitted for every image, matched to the layout's breakpoints. */
const WIDTHS = [480, 960, 1600] as const;

export type ImageRole = 'wide' | 'alt' | 'detail' | 'tech';

const ROLE_ORDER: ImageRole[] = ['wide', 'alt', 'detail', 'tech'];

const ROLE_LABEL: Record<ImageRole, string> = {
  wide: 'Wide environment',
  alt: 'Alternate camera angle',
  detail: 'Production detail angle',
  tech: 'Technical environment angle',
};

export interface DerivedImage {
  role: ImageRole;
  roleLabel: string;
  /** Ordinal shown in the UI as IMAGE 01 … IMAGE 04. */
  position: number;
  width: number;
  height: number;
  aspectRatio: number;
  avif: string;
  webp: string;
  avifSrcSet: string;
  webpSrcSet: string;
  lqip: string;
  dominant: string;
  sourceFile: string;
  bytes: number;
}

export interface StudioMedia {
  slug: string;
  accent: string;
  images: DerivedImage[];
}

type StudioSource = Record<ImageRole, number> & { accent?: string };

interface SourceMap {
  studios: Record<string, StudioSource>;
}

/** sRGB relative luminance, used to keep accents legible on a dark ground. */
function luminance(r: number, g: number, b: number): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return [h * 360, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r1, g1, b1] =
    hp < 1 ? [c, x, 0]
    : hp < 2 ? [x, c, 0]
    : hp < 3 ? [0, c, x]
    : hp < 4 ? [0, x, c]
    : hp < 5 ? [x, 0, c]
    : [c, 0, x];
  const m = l - c / 2;
  return [(r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255];
}

/**
 * Derives each studio's signature accent from its set lighting.
 *
 * Two things skew a naive dominant-colour read on these frames: the presenter
 * sits dead centre in every composition (skin and hair dominate the chroma),
 * and warm practical lamps blow out to near-orange regardless of the set. So we
 * sample only the border ring — the environment — and take the peak of a
 * chroma-weighted hue histogram rather than any single pixel. The winning hue
 * is then re-seated at a fixed saturation/lightness so all ten accents carry
 * equal weight against the midnight ground.
 */
async function extractAccent(file: string): Promise<string> {
  const SIZE = 96;
  const { data, info } = await sharp(file)
    .resize(SIZE, SIZE, { fit: 'cover' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const inner = { lo: SIZE * 0.25, hi: SIZE * 0.75 };
  const BUCKETS = 36;
  const weight = new Float64Array(BUCKETS);
  const sinSum = new Float64Array(BUCKETS);
  const cosSum = new Float64Array(BUCKETS);
  let chromaMass = 0;

  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      // Skip the central box: that is the presenter, not the environment.
      if (x > inner.lo && x < inner.hi && y > inner.lo && y < inner.hi) continue;
      const i = (y * info.width + x) * info.channels;
      const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
      // Mid-tones carry set colour; crushed blacks and clipped highlights do not.
      if (l < 0.08 || l > 0.94) continue;
      const w = s * s * (1 - Math.abs(l - 0.5));
      if (w <= 0) continue;
      const b = Math.min(BUCKETS - 1, Math.floor((h / 360) * BUCKETS));
      weight[b] += w;
      const rad = (h * Math.PI) / 180;
      sinSum[b] += Math.sin(rad) * w;
      cosSum[b] += Math.cos(rad) * w;
      chromaMass += w;
    }
  }

  // A near-monochrome set (Arctic Ice) has no meaningful hue peak; fall back to
  // the cool steel that its lighting actually reads as.
  const perPixel = chromaMass / (info.width * info.height);
  if (perPixel < 0.012) return '#8fb8d6';

  let peak = 0;
  for (let b = 1; b < BUCKETS; b++) if (weight[b] > weight[peak]) peak = b;

  // Circular mean within the winning bucket and its neighbours.
  let sn = 0;
  let cs = 0;
  for (const off of [-1, 0, 1]) {
    const b = (peak + off + BUCKETS) % BUCKETS;
    sn += sinSum[b];
    cs += cosSum[b];
  }
  const hue = (((Math.atan2(sn, cs) * 180) / Math.PI) % 360 + 360) % 360;

  const [r, g, b] = hslToRgb(hue, 0.62, 0.58);
  return toHex(r, g, b);
}

async function makeLqip(file: string): Promise<string> {
  const buf = await sharp(file)
    .resize(20, 20, { fit: 'inside' })
    .webp({ quality: 30, alphaQuality: 0 })
    .toBuffer();
  return `data:image/webp;base64,${buf.toString('base64')}`;
}

async function main() {
  if (!existsSync(SOURCE_DIR)) {
    throw new Error(`Missing source directory: ${SOURCE_DIR}`);
  }

  const sourceMap: SourceMap = JSON.parse(
    await readFile(path.join(ROOT, 'assets/studio-source-map.json'), 'utf8'),
  );
  const available = new Set(await readdir(SOURCE_DIR));

  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(path.dirname(MANIFEST), { recursive: true });

  const studios: StudioMedia[] = [];
  let emitted = 0;
  let skipped = 0;

  for (const [slug, roles] of Object.entries(sourceMap.studios)) {
    const studioOut = path.join(OUT_DIR, slug);
    await mkdir(studioOut, { recursive: true });

    const images: DerivedImage[] = [];

    for (const [position, role] of ROLE_ORDER.entries()) {
      const index = roles[role];
      const sourceFile = `${slug}-${index}.jpg`;
      if (!available.has(sourceFile)) {
        throw new Error(`Source map references missing file: ${sourceFile}`);
      }
      const abs = path.join(SOURCE_DIR, sourceFile);
      const meta = await sharp(abs).metadata();
      const srcWidth = meta.width ?? 0;
      const srcHeight = meta.height ?? 0;
      if (!srcWidth || !srcHeight) throw new Error(`Unreadable dimensions: ${sourceFile}`);

      // Content hash keeps filenames immutable-cacheable across rebuilds.
      const hash = createHash('sha256')
        .update(await readFile(abs))
        .digest('hex')
        .slice(0, 8);

      const avifSet: string[] = [];
      const webpSet: string[] = [];
      let bytes = 0;

      for (const w of WIDTHS) {
        // Never upscale past the master.
        const target = Math.min(w, srcWidth);
        const base = `${role}-${target}-${hash}`;
        const pipeline = sharp(abs).resize(target, undefined, { withoutEnlargement: true });

        const avifPath = path.join(studioOut, `${base}.avif`);
        const webpPath = path.join(studioOut, `${base}.webp`);

        if (existsSync(avifPath) && existsSync(webpPath)) {
          skipped += 2;
        } else {
          const [a, wp] = await Promise.all([
            pipeline.clone().avif({ quality: 52, effort: 4 }).toFile(avifPath),
            pipeline.clone().webp({ quality: 76 }).toFile(webpPath),
          ]);
          bytes += a.size + wp.size;
          emitted += 2;
        }

        avifSet.push(`/media/studios/${slug}/${base}.avif ${target}w`);
        webpSet.push(`/media/studios/${slug}/${base}.webp ${target}w`);
      }

      const widest = Math.min(WIDTHS[WIDTHS.length - 1], srcWidth);
      images.push({
        role,
        roleLabel: ROLE_LABEL[role],
        position: position + 1,
        width: srcWidth,
        height: srcHeight,
        aspectRatio: Number((srcWidth / srcHeight).toFixed(4)),
        avif: `/media/studios/${slug}/${role}-${widest}-${hash}.avif`,
        webp: `/media/studios/${slug}/${role}-${widest}-${hash}.webp`,
        avifSrcSet: avifSet.join(', '),
        webpSrcSet: webpSet.join(', '),
        lqip: await makeLqip(abs),
        dominant: await extractAccent(abs),
        sourceFile,
        bytes,
      });
    }

    // Authored accents win; extraction is the fallback for newly added sets.
    studios.push({ slug, accent: roles.accent ?? images[0].dominant, images });
  }

  await writeFile(
    MANIFEST,
    `${JSON.stringify({ generatedBy: 'scripts/build-media.ts', widths: WIDTHS, studios }, null, 2)}\n`,
  );

  console.log(
    `media: ${studios.length} studios, ${studios.length * 4} images, ` +
      `${emitted} derivatives written, ${skipped} reused`,
  );
  for (const s of studios) console.log(`  ${s.slug.padEnd(22)} accent ${s.accent}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
