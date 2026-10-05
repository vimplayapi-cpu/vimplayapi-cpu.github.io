import { createHash, randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

/**
 * Media storage for administrator uploads.
 *
 * Security posture:
 *  - The stored filename is generated server-side (uuid + content hash). The
 *    client's filename is kept only as a display label, never as a path, so
 *    path traversal and extension smuggling are structurally impossible.
 *  - The MIME type is decided by sniffing the actual bytes with sharp for
 *    images, not by trusting the upload's Content-Type header.
 *  - Everything is written beneath UPLOAD_ROOT, and each resolved path is
 *    re-checked to be inside it before any write or delete.
 */

/**
 * Uploads are stored OUTSIDE public/ so that a single persistent volume can
 * cover both the database and user media (hosts generally allow one disk per
 * service). They are served back through src/app/uploads/[...path]/route.ts,
 * which keeps the public /uploads/... URLs unchanged.
 */
const UPLOAD_ROOT =
  process.env.LM_UPLOAD_DIR ??
  path.join(process.env.LM_DATA_DIR ?? path.join(process.cwd(), 'data'), 'uploads');

export { UPLOAD_ROOT };

/** Image formats we are willing to decode and re-encode. */
const IMAGE_FORMATS = new Set(['jpeg', 'png', 'webp', 'avif', 'gif', 'tiff']);

/** Video containers accepted. These are stored as-is and never transcoded. */
const VIDEO_MIME = new Map<string, string>([
  ['video/mp4', 'mp4'],
  ['video/webm', 'webm'],
  ['video/quicktime', 'mov'],
]);

export const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

const WIDTHS = [480, 960, 1600] as const;

export interface StoredImage {
  kind: 'image';
  storageKey: string;
  mime: string;
  bytes: number;
  width: number;
  height: number;
  lqip: string;
  dominant: string;
  variants: {
    avif: string;
    webp: string;
    avifSrcSet: string;
    webpSrcSet: string;
  };
}

export interface StoredVideo {
  kind: 'video';
  storageKey: string;
  mime: string;
  bytes: number;
  variants: { src: string };
}

/** Throws if a resolved path escapes the upload root. */
function assertInsideRoot(target: string): void {
  const resolved = path.resolve(target);
  const root = path.resolve(UPLOAD_ROOT);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new Error('Refusing to write outside the upload root.');
  }
}

export async function storeImage(buffer: Buffer): Promise<StoredImage> {
  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    throw new Error('Image is larger than the 25MB limit.');
  }

  // Decode first: if sharp cannot read it, it is not an image we accept,
  // regardless of what the client claimed.
  let meta: Awaited<ReturnType<ReturnType<typeof sharp>['metadata']>>;
  try {
    meta = await sharp(buffer, { limitInputPixels: 40_000_000 }).metadata();
  } catch {
    throw new Error('That file could not be read as an image.');
  }

  if (!meta.format || !IMAGE_FORMATS.has(meta.format)) {
    throw new Error('Unsupported image format.');
  }
  if (!meta.width || !meta.height) {
    throw new Error('Could not determine image dimensions.');
  }

  const hash = createHash('sha256').update(buffer).digest('hex').slice(0, 10);
  const id = `${randomUUID()}-${hash}`;
  const dir = path.join(UPLOAD_ROOT, 'images', id);
  assertInsideRoot(dir);
  await mkdir(dir, { recursive: true });

  const avifSet: string[] = [];
  const webpSet: string[] = [];
  let bytes = 0;

  for (const w of WIDTHS) {
    const target = Math.min(w, meta.width);
    // rotate() applies the EXIF orientation and then strips metadata, which
    // also removes any GPS/camera data from the published derivative.
    const pipeline = sharp(buffer).rotate().resize(target, undefined, { withoutEnlargement: true });

    const avifPath = path.join(dir, `${target}.avif`);
    const webpPath = path.join(dir, `${target}.webp`);
    assertInsideRoot(avifPath);
    assertInsideRoot(webpPath);

    const [a, wp] = await Promise.all([
      pipeline.clone().avif({ quality: 52, effort: 4 }).toFile(avifPath),
      pipeline.clone().webp({ quality: 78 }).toFile(webpPath),
    ]);
    bytes += a.size + wp.size;

    avifSet.push(`/uploads/images/${id}/${target}.avif ${target}w`);
    webpSet.push(`/uploads/images/${id}/${target}.webp ${target}w`);
  }

  const lqipBuf = await sharp(buffer).rotate().resize(20, 20, { fit: 'inside' }).webp({ quality: 30 }).toBuffer();
  const stats = await sharp(buffer).stats();
  const { r, g, b } = stats.dominant;
  const dominant = `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;

  const widest = Math.min(WIDTHS[WIDTHS.length - 1], meta.width);

  return {
    kind: 'image',
    storageKey: `images/${id}`,
    mime: 'image/webp',
    bytes,
    width: meta.width,
    height: meta.height,
    lqip: `data:image/webp;base64,${lqipBuf.toString('base64')}`,
    dominant,
    variants: {
      avif: `/uploads/images/${id}/${widest}.avif`,
      webp: `/uploads/images/${id}/${widest}.webp`,
      avifSrcSet: avifSet.join(', '),
      webpSrcSet: webpSet.join(', '),
    },
  };
}

/**
 * Stores a video without transcoding.
 *
 * The container is verified by inspecting the file's magic bytes rather than
 * trusting the declared type, so a script cannot be uploaded as "video/mp4".
 */
export async function storeVideo(buffer: Buffer, declaredMime: string): Promise<StoredVideo> {
  if (buffer.byteLength > MAX_VIDEO_BYTES) {
    throw new Error('Video is larger than the 200MB limit.');
  }

  const ext = VIDEO_MIME.get(declaredMime);
  if (!ext) throw new Error('Unsupported video format. Use MP4 or WebM.');

  if (!looksLikeVideo(buffer, ext)) {
    throw new Error('That file does not look like a valid video container.');
  }

  const hash = createHash('sha256').update(buffer).digest('hex').slice(0, 10);
  const id = `${randomUUID()}-${hash}`;
  const dir = path.join(UPLOAD_ROOT, 'videos');
  assertInsideRoot(dir);
  await mkdir(dir, { recursive: true });

  const filePath = path.join(dir, `${id}.${ext}`);
  assertInsideRoot(filePath);
  await writeFile(filePath, buffer);

  return {
    kind: 'video',
    storageKey: `videos/${id}.${ext}`,
    mime: declaredMime,
    bytes: buffer.byteLength,
    variants: { src: `/uploads/videos/${id}.${ext}` },
  };
}

/** Magic-byte check for the accepted containers. */
function looksLikeVideo(buffer: Buffer, ext: string): boolean {
  if (buffer.length < 16) return false;

  if (ext === 'webm') {
    // EBML header.
    return buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3;
  }

  // ISO base media (mp4/mov): 'ftyp' box at offset 4.
  return buffer.toString('ascii', 4, 8) === 'ftyp';
}

/** Removes a stored asset. Only paths inside the upload root are touched. */
export async function deleteStored(storageKey: string): Promise<void> {
  // storageKey is generated by this module, but normalise defensively in case
  // a legacy or hand-edited row reaches here.
  const target = path.join(UPLOAD_ROOT, storageKey);
  assertInsideRoot(target);

  if (storageKey.startsWith('images/')) {
    await Promise.all(
      WIDTHS.flatMap((w) =>
        ['avif', 'webp'].map((fmt) =>
          unlink(path.join(target, `${w}.${fmt}`)).catch(() => undefined),
        ),
      ),
    );
    return;
  }
  await unlink(target).catch(() => undefined);
}
