import { z } from 'zod';

import { ApiError, withAdminApi } from '@/lib/auth/guard';
import { getDb, now } from '@/lib/db/client';
import { fieldErrors, seoSchema } from '@/lib/validation/schemas';

export const dynamic = 'force-dynamic';

export const GET = withAdminApi(
  () =>
    getDb()
      .prepare(`
        SELECT s.id, s.route, s.title, s.description, s.canonical, s.robots, s.og_image_id,
               s.updated_at, m.variants AS og_variants
        FROM seo_metadata s LEFT JOIN media m ON m.id = s.og_image_id
        ORDER BY s.route
      `)
      .all(),
  { permission: 'content.read' },
);

const bulkSchema = z.object({ records: z.array(seoSchema).min(1).max(200) });

/** Upserts SEO records by route, so a new dynamic route can be tuned too. */
export const PUT = withAdminApi(
  async ({ req, audit }) => {
    const body = await req.json().catch(() => null);
    const parsed = bulkSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, 'Invalid SEO payload.', 'invalid', fieldErrors(parsed.error));
    }

    const db = getDb();
    const t = now();
    const stmt = db.prepare(`
      INSERT INTO seo_metadata (route, title, description, canonical, robots, og_image_id, updated_at)
      VALUES (@route, @title, @description, @canonical, @robots, @og_image_id, @t)
      ON CONFLICT(route) DO UPDATE SET
        title = excluded.title, description = excluded.description,
        canonical = excluded.canonical, robots = excluded.robots,
        og_image_id = excluded.og_image_id, updated_at = excluded.updated_at
    `);

    db.transaction(() => {
      for (const r of parsed.data.records) {
        stmt.run({
          route: r.route,
          title: r.title,
          description: r.description,
          canonical: r.canonical,
          robots: r.robots,
          og_image_id: r.og_image_id ?? null,
          t,
        });
      }
    })();

    audit('seo.update', 'seo_metadata', undefined, {
      routes: parsed.data.records.map((r) => r.route),
    });
    return { updated: parsed.data.records.length };
  },
  { permission: 'content.write' },
);
