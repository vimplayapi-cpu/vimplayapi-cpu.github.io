import { NextResponse } from 'next/server';
import { z } from 'zod';

import { ApiError, withAdminApi } from '@/lib/auth/guard';
import { getDb, now } from '@/lib/db/client';
import { adminListStudios } from '@/lib/admin/queries';
import { fieldErrors, reorderSchema, studioSchema } from '@/lib/validation/schemas';

export const dynamic = 'force-dynamic';

export const GET = withAdminApi(() => adminListStudios(), { permission: 'content.read' });

/** Create a studio. Slug uniqueness is enforced by the schema's UNIQUE index. */
export const POST = withAdminApi(
  async ({ req, audit }) => {
    const body = await req.json().catch(() => null);
    const parsed = studioSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, 'Check the highlighted fields.', 'invalid', fieldErrors(parsed.error));
    }
    const d = parsed.data;
    const db = getDb();

    if (db.prepare('SELECT id FROM studios WHERE slug = ?').get(d.slug)) {
      throw new ApiError(409, 'That slug is already in use.', 'conflict', { slug: 'Already in use.' });
    }

    const t = now();
    const nextOrder =
      (db.prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM studios').get() as { m: number }).m + 1;

    const result = db
      .prepare(`
        INSERT INTO studios (slug, code, name, tagline, description, environment, capacity,
                             production_characteristics, technical_capabilities, location_id, status,
                             availability_note, accent, cta_label, seo_title, seo_description,
                             is_published, sort_order, created_at, updated_at)
        VALUES (@slug, @code, @name, @tagline, @description, @environment, @capacity,
                @characteristics, @capabilities, @location_id, @status,
                @availability_note, @accent, @cta_label, @seo_title, @seo_description,
                @is_published, @sort_order, @t, @t)
      `)
      .run({
        slug: d.slug, code: d.code, name: d.name, tagline: d.tagline,
        description: d.description, environment: d.environment, capacity: d.capacity,
        characteristics: JSON.stringify(d.production_characteristics ?? []),
        capabilities: JSON.stringify(d.technical_capabilities ?? []),
        location_id: d.location_id ?? null,
        status: d.status, availability_note: d.availability_note, accent: d.accent,
        cta_label: d.cta_label, seo_title: d.seo_title, seo_description: d.seo_description,
        is_published: d.is_published ? 1 : 0, sort_order: nextOrder, t,
      });

    const id = Number(result.lastInsertRowid);
    // Every studio gets its four image slots up front so the editor has
    // somewhere to attach media.
    const slot = db.prepare(
      'INSERT INTO studio_images (studio_id, media_id, role, position, alt, caption) VALUES (?, NULL, ?, ?, \'\', \'\')',
    );
    (['wide', 'alt', 'detail', 'tech'] as const).forEach((role, i) => slot.run(id, role, i + 1));
    db.prepare('INSERT INTO studio_videos (studio_id) VALUES (?)').run(id);

    audit('studio.create', 'studios', id, { slug: d.slug });
    return NextResponse.json({ ok: true, data: { id } }, { status: 201 });
  },
  { permission: 'content.write', rateLimit: { key: 'studio-write', limit: 60, windowSeconds: 300 } },
);

/** Reorder studios. Accepts the full ordered id list. */
export const PATCH = withAdminApi(
  async ({ req, audit }) => {
    const body = await req.json().catch(() => null);
    const parsed = reorderSchema.safeParse(body);
    if (!parsed.success) throw new ApiError(400, 'Invalid order payload.', 'invalid');

    const db = getDb();
    const stmt = db.prepare('UPDATE studios SET sort_order = ?, updated_at = ? WHERE id = ?');
    const t = now();
    db.transaction(() => {
      parsed.data.ids.forEach((id, i) => stmt.run(i, t, id));
    })();

    audit('studio.reorder', 'studios', undefined, { count: parsed.data.ids.length });
    return { reordered: parsed.data.ids.length };
  },
  { permission: 'content.write' },
);
