import { NextResponse } from 'next/server';

import { ApiError, withAdminApi } from '@/lib/auth/guard';
import { adminListMedia } from '@/lib/admin/queries';
import { MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, storeImage, storeVideo } from '@/lib/admin/media-store';
import { getDb, now } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

export const GET = withAdminApi(
  ({ req }) => {
    const params = new URL(req.url).searchParams;
    const limit = Math.min(Number(params.get('limit') ?? 60) || 60, 200);
    const offset = Math.max(Number(params.get('offset') ?? 0) || 0, 0);
    return adminListMedia({
      kind: params.get('kind') ?? undefined,
      q: params.get('q')?.slice(0, 100) ?? undefined,
      limit,
      offset,
    });
  },
  { permission: 'media.read' },
);

/**
 * Upload handler.
 *
 * Files are read fully into memory and validated by content, never by the
 * filename or the declared Content-Type. Uploading is rate limited per user so
 * a compromised session cannot be used to fill the disk.
 */
export const POST = withAdminApi(
  async ({ req, audit, session }) => {
    const form = await req.formData().catch(() => null);
    if (!form) throw new ApiError(400, 'Expected a multipart upload.', 'invalid');

    const file = form.get('file');
    if (!(file instanceof File)) throw new ApiError(400, 'No file supplied.', 'invalid');

    const declared = file.type || 'application/octet-stream';
    const isVideo = declared.startsWith('video/');
    const cap = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (file.size > cap) {
      throw new ApiError(413, `File exceeds the ${Math.round(cap / 1024 / 1024)}MB limit.`, 'too_large');
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let stored;
    try {
      stored = isVideo ? await storeVideo(buffer, declared) : await storeImage(buffer);
    } catch (err) {
      throw new ApiError(400, err instanceof Error ? err.message : 'Upload failed.', 'invalid');
    }

    const t = now();
    const alt = String(form.get('alt') ?? '').slice(0, 400);
    const caption = String(form.get('caption') ?? '').slice(0, 400);

    const result = getDb()
      .prepare(`
        INSERT INTO media (kind, storage_key, original_name, mime, bytes, width, height,
                           alt, caption, variants, lqip, dominant, is_managed, uploaded_by, created_at, updated_at)
        VALUES (@kind, @storage_key, @original_name, @mime, @bytes, @width, @height,
                @alt, @caption, @variants, @lqip, @dominant, 0, @uploaded_by, @t, @t)
      `)
      .run({
        kind: stored.kind,
        storage_key: stored.storageKey,
        // Kept for display only — never used to build a path.
        original_name: file.name.slice(0, 255),
        mime: stored.mime,
        bytes: stored.bytes,
        width: stored.kind === 'image' ? stored.width : null,
        height: stored.kind === 'image' ? stored.height : null,
        alt,
        caption,
        variants: JSON.stringify(stored.variants),
        lqip: stored.kind === 'image' ? stored.lqip : '',
        dominant: stored.kind === 'image' ? stored.dominant : '',
        uploaded_by: session.user.id,
        t,
      });

    const id = Number(result.lastInsertRowid);
    audit('media.upload', 'media', id, { kind: stored.kind, bytes: stored.bytes });

    return NextResponse.json(
      { ok: true, data: { id, kind: stored.kind, storageKey: stored.storageKey } },
      { status: 201 },
    );
  },
  {
    permission: 'media.write',
    // Generous enough for a real bulk upload session, low enough to bound abuse.
    rateLimit: { key: 'media-upload', limit: 100, windowSeconds: 600 },
  },
);
