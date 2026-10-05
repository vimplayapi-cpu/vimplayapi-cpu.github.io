import { NextResponse } from 'next/server';
import { z } from 'zod';

import { ApiError, withAdminApi } from '@/lib/auth/guard';
import { adminGetStudio } from '@/lib/admin/queries';
import { getDb, now } from '@/lib/db/client';
import { fieldErrors, studioSchema } from '@/lib/validation/schemas';

export const dynamic = 'force-dynamic';

/**
 * Resolves the :id segment.
 *
 * The id is parsed and range-checked here rather than trusted from the URL,
 * and every handler then scopes its query by that id — there is no path where
 * a client-supplied value reaches SQL unparameterised.
 */
function parseId(req: Request): number {
  const segments = new URL(req.url).pathname.split('/');
  const raw = segments[segments.length - 1];
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw new ApiError(400, 'Invalid id.', 'invalid');
  return id;
}

export const GET = withAdminApi(
  ({ req }) => {
    const studio = adminGetStudio(parseId(req));
    if (!studio) throw new ApiError(404, 'Studio not found.', 'not_found');
    return studio;
  },
  { permission: 'content.read' },
);

export const PUT = withAdminApi(
  async ({ req, audit, session }) => {
    const id = parseId(req);
    const body = await req.json().catch(() => null);
    const parsed = studioSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, 'Check the highlighted fields.', 'invalid', fieldErrors(parsed.error));
    }
    const d = parsed.data;
    const db = getDb();

    const existing = db.prepare('SELECT id, is_published FROM studios WHERE id = ?').get(id) as
      | { id: number; is_published: number }
      | undefined;
    if (!existing) throw new ApiError(404, 'Studio not found.', 'not_found');

    // Slug must stay unique across other rows.
    const clash = db.prepare('SELECT id FROM studios WHERE slug = ? AND id != ?').get(d.slug, id);
    if (clash) {
      throw new ApiError(409, 'That slug is already in use.', 'conflict', { slug: 'Already in use.' });
    }

    // Publishing is a separate permission from editing.
    const changingPublish = (existing.is_published === 1) !== d.is_published;
    if (changingPublish && !session.user.permissions.includes('super')
        && !session.user.permissions.includes('content.publish')) {
      throw new ApiError(403, 'You do not have permission to publish or unpublish content.', 'forbidden');
    }

    db.prepare(`
      UPDATE studios SET
        slug = @slug, code = @code, name = @name, tagline = @tagline,
        description = @description, environment = @environment, capacity = @capacity,
        production_characteristics = @characteristics, technical_capabilities = @capabilities,
        location_id = @location_id, status = @status, availability_note = @availability_note,
        accent = @accent, cta_label = @cta_label, seo_title = @seo_title,
        seo_description = @seo_description, is_published = @is_published, updated_at = @t
      WHERE id = @id
    `).run({
      id,
      slug: d.slug, code: d.code, name: d.name, tagline: d.tagline,
      description: d.description, environment: d.environment, capacity: d.capacity,
      characteristics: JSON.stringify(d.production_characteristics ?? []),
      capabilities: JSON.stringify(d.technical_capabilities ?? []),
      location_id: d.location_id ?? null,
      status: d.status, availability_note: d.availability_note, accent: d.accent,
      cta_label: d.cta_label, seo_title: d.seo_title, seo_description: d.seo_description,
      is_published: d.is_published ? 1 : 0, t: now(),
    });

    audit('studio.update', 'studios', id, { slug: d.slug, published: d.is_published });
    return { id };
  },
  { permission: 'content.write' },
);

export const DELETE = withAdminApi(
  async ({ req, audit }) => {
    const id = parseId(req);
    const db = getDb();
    const studio = db.prepare('SELECT slug, name FROM studios WHERE id = ?').get(id) as
      | { slug: string; name: string }
      | undefined;
    if (!studio) throw new ApiError(404, 'Studio not found.', 'not_found');

    // studio_images / studio_videos cascade; demo_requests keep their label
    // via ON DELETE SET NULL so the lead record stays readable.
    db.prepare('DELETE FROM studios WHERE id = ?').run(id);

    audit('studio.delete', 'studios', id, { slug: studio.slug, name: studio.name });
    return { deleted: id };
  },
  { permission: 'content.delete' },
);

/** Attach or clear media on one of the studio's four image slots. */
const imageSlotSchema = z.object({
  position: z.coerce.number().int().min(1).max(4),
  media_id: z.coerce.number().int().positive().nullable(),
  alt: z.string().max(400).optional().default(''),
  caption: z.string().max(400).optional().default(''),
});

export const PATCH = withAdminApi(
  async ({ req, audit }) => {
    const id = parseId(req);
    const body = await req.json().catch(() => null);

    const db = getDb();
    if (!db.prepare('SELECT id FROM studios WHERE id = ?').get(id)) {
      throw new ApiError(404, 'Studio not found.', 'not_found');
    }

    // Two shapes: an image slot update, or the video slot.
    if (body && typeof body === 'object' && 'position' in body) {
      const parsed = imageSlotSchema.safeParse(body);
      if (!parsed.success) throw new ApiError(400, 'Invalid image payload.', 'invalid', fieldErrors(parsed.error));
      const d = parsed.data;

      if (d.media_id !== null) {
        const media = db.prepare("SELECT id FROM media WHERE id = ? AND kind = 'image'").get(d.media_id);
        if (!media) throw new ApiError(400, 'That media item is not an image.', 'invalid');
      }

      db.prepare(
        'UPDATE studio_images SET media_id = ?, alt = ?, caption = ? WHERE studio_id = ? AND position = ?',
      ).run(d.media_id, d.alt, d.caption, id, d.position);

      audit('studio.image.update', 'studios', id, { position: d.position, mediaId: d.media_id });
      return { updated: true };
    }

    const videoSchema = z.object({
      video_media_id: z.coerce.number().int().positive().nullable(),
      poster_media_id: z.coerce.number().int().positive().nullable().optional(),
      title: z.string().max(200).optional().default(''),
      caption: z.string().max(400).optional().default(''),
    });
    const parsed = videoSchema.safeParse(body);
    if (!parsed.success) throw new ApiError(400, 'Invalid video payload.', 'invalid', fieldErrors(parsed.error));
    const d = parsed.data;

    if (d.video_media_id !== null) {
      const media = db.prepare("SELECT id FROM media WHERE id = ? AND kind = 'video'").get(d.video_media_id);
      if (!media) throw new ApiError(400, 'That media item is not a video.', 'invalid');
    }

    db.prepare(`
      INSERT INTO studio_videos (studio_id, media_id, poster_media_id, title, caption)
      VALUES (@studio_id, @media_id, @poster, @title, @caption)
      ON CONFLICT(studio_id) DO UPDATE SET
        media_id = excluded.media_id, poster_media_id = excluded.poster_media_id,
        title = excluded.title, caption = excluded.caption
    `).run({
      studio_id: id,
      media_id: d.video_media_id,
      poster: d.poster_media_id ?? null,
      title: d.title,
      caption: d.caption,
    });

    audit('studio.video.update', 'studios', id, { mediaId: d.video_media_id });
    return { updated: true };
  },
  { permission: 'content.write' },
);
