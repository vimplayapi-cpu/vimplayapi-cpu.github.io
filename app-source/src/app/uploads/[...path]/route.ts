import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';

import { UPLOAD_ROOT } from '@/lib/admin/media-store';

export const dynamic = 'force-dynamic';

/**
 * Serves administrator-uploaded media.
 *
 * Uploads live outside public/ (on the persistent volume), so this route
 * streams them back at the same /uploads/... URLs the database stores.
 *
 * Path safety: the requested segments are joined onto the upload root and the
 * result is then re-checked to be inside it. Any traversal attempt — encoded
 * or otherwise — resolves outside the root and is rejected with a 404, which
 * also avoids confirming whether a path exists.
 */

const CONTENT_TYPES: Record<string, string> = {
  '.avif': 'image/avif',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;

  // Reject anything with a traversal or NUL byte before touching the disk.
  if (!segments?.length || segments.some((s) => s.includes('..') || s.includes('\0'))) {
    return new Response('Not found', { status: 404 });
  }

  const target = path.resolve(UPLOAD_ROOT, ...segments);
  const root = path.resolve(UPLOAD_ROOT);
  if (target !== root && !target.startsWith(root + path.sep)) {
    return new Response('Not found', { status: 404 });
  }

  const ext = path.extname(target).toLowerCase();
  const contentType = CONTENT_TYPES[ext];
  // Only serve media types we recognise — never arbitrary files.
  if (!contentType) return new Response('Not found', { status: 404 });

  let info;
  try {
    info = await stat(target);
  } catch {
    return new Response('Not found', { status: 404 });
  }
  if (!info.isFile()) return new Response('Not found', { status: 404 });

  const stream = Readable.toWeb(createReadStream(target)) as ReadableStream;

  return new Response(stream, {
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(info.size),
      // Filenames are content-hashed at upload, so they are immutable.
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
