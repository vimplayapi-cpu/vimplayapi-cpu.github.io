/**
 * Generates the brand raster assets: favicons, apple touch icon and the
 * OpenGraph card. Run via the `prebuild` hook alongside the media pipeline.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const APP = path.join(ROOT, 'src/app');

const VOID = '#05070A';
const SIGNAL = '#3DDCE8';
const CHALK = '#F2F5F8';

/**
 * Square icon mark: the transmission dot with its two signal arcs, framed by a
 * hairline border so it reads at small sizes.
 */
const ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="${VOID}"/>
  <rect x="0.5" y="0.5" width="63" height="63" fill="none" stroke="${CHALK}" stroke-opacity="0.14"/>
  <g fill="none" stroke="${CHALK}" stroke-width="3.2" stroke-linecap="round">
    <path d="M20 20 v24"/>
    <path d="M32 25a11 11 0 0 1 0 14"/>
    <path d="M41 19a21 21 0 0 1 0 26"/>
  </g>
  <circle cx="20" cy="32" r="4.6" fill="${SIGNAL}"/>
</svg>`;

/** Builds a real .ico container wrapping PNG payloads at several sizes. */
async function buildIco(sizes: number[]): Promise<Buffer> {
  const pngs = await Promise.all(
    sizes.map((s) => sharp(Buffer.from(ICON_SVG)).resize(s, s).png().toBuffer()),
  );

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(sizes.length, 4);

  const entries: Buffer[] = [];
  let offset = 6 + sizes.length * 16;

  sizes.forEach((size, i) => {
    const entry = Buffer.alloc(16);
    // 0 in the width/height byte means 256.
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2); // palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(pngs[i].length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += pngs[i].length;
    entries.push(entry);
  });

  return Buffer.concat([header, ...entries, ...pngs]);
}

/**
 * OpenGraph card, composited over a real studio frame so a shared link shows
 * the actual work rather than a flat colour panel.
 */
async function buildOgImage() {
  const W = 1200;
  const H = 630;
  const backdrop = path.join(ROOT, 'assets/source/studios/neon-noir-4.jpg');

  const base = await sharp(backdrop)
    .resize(W, H, { fit: 'cover', position: 'centre' })
    // Push the photograph back so the type stays legible.
    .modulate({ brightness: 0.42, saturation: 0.85 })
    .blur(1.5)
    .toBuffer();

  const overlay = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="${VOID}" stop-opacity="0.55"/>
      <stop offset="55%"  stop-color="${VOID}" stop-opacity="0.78"/>
      <stop offset="100%" stop-color="${VOID}" stop-opacity="0.96"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#scrim)"/>

  <!-- Framing marks -->
  <g stroke="${CHALK}" stroke-opacity="0.22" stroke-width="1.5" fill="none">
    <path d="M64 92 h34 M64 92 v34"/>
    <path d="M${W - 64} 92 h-34 M${W - 64} 92 v34"/>
    <path d="M64 ${H - 92} h34 M64 ${H - 92} v-34"/>
    <path d="M${W - 64} ${H - 92} h-34 M${W - 64} ${H - 92} v-34"/>
  </g>

  <!-- Live signal indicator -->
  <circle cx="76" cy="163" r="5" fill="#FF3B30"/>
  <text x="94" y="169" font-family="'IBM Plex Mono', ui-monospace, monospace" font-size="17"
        letter-spacing="4.4" fill="${CHALK}" fill-opacity="0.72">LIVE SIGNAL ACTIVE</text>

  <text x="72" y="330" font-family="Archivo, 'Helvetica Neue', Arial, sans-serif"
        font-size="76" font-weight="700" letter-spacing="-1.6" fill="${CHALK}">WE BUILD THE STUDIOS</text>
  <text x="72" y="410" font-family="Archivo, 'Helvetica Neue', Arial, sans-serif"
        font-size="76" font-weight="700" letter-spacing="-1.6" fill="${CHALK}">BEHIND LIVE BROADCAST.</text>

  <path d="M72 462 H1128" stroke="${CHALK}" stroke-opacity="0.16" stroke-width="1"/>
  <path d="M72 462 H268" stroke="${SIGNAL}" stroke-width="1.5"/>

  <text x="72" y="516" font-family="Archivo, 'Helvetica Neue', Arial, sans-serif"
        font-size="30" font-weight="700" letter-spacing="2.4" fill="${CHALK}">LIVE MIRACLE</text>
  <text x="72" y="556" font-family="'IBM Plex Mono', ui-monospace, monospace" font-size="16"
        letter-spacing="3.2" fill="${CHALK}" fill-opacity="0.6">GEORGIA · ARMENIA · BULGARIA · UKRAINE</text>
</svg>`);

  await sharp(base)
    .composite([{ input: overlay, top: 0, left: 0 }])
    .png({ quality: 90 })
    .toFile(path.join(PUBLIC, 'og-image.png'));
}

async function main() {
  await mkdir(PUBLIC, { recursive: true });

  // Modern browsers take the SVG; the .ico covers older ones.
  await writeFile(path.join(PUBLIC, 'favicon.svg'), ICON_SVG.trim());
  await writeFile(path.join(PUBLIC, 'favicon.ico'), await buildIco([16, 32, 48]));

  // Next.js App Router conventions.
  await writeFile(path.join(APP, 'icon.svg'), ICON_SVG.trim());
  await sharp(Buffer.from(ICON_SVG))
    .resize(180, 180)
    .png()
    .toFile(path.join(APP, 'apple-icon.png'));

  await buildOgImage();

  console.log('brand: favicon.svg, favicon.ico, icon.svg, apple-icon.png, og-image.png');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
