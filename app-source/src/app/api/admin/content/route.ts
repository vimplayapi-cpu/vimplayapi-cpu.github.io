import { z } from 'zod';

import { ApiError, withAdminApi } from '@/lib/auth/guard';
import { getDb, now } from '@/lib/db/client';
import { contentBlockSchema, fieldErrors } from '@/lib/validation/schemas';

export const dynamic = 'force-dynamic';

export const GET = withAdminApi(
  ({ req }) => {
    const page = new URL(req.url).searchParams.get('page');
    const db = getDb();

    if (page) {
      return db
        .prepare(`
          SELECT id, page, block_key, value, value_type, label, hint, sort_order, updated_at
          FROM content_blocks WHERE page = ? ORDER BY sort_order, id
        `)
        .all(page);
    }

    // No page given — return the list of pages with block counts.
    return db
      .prepare(`
        SELECT page, COUNT(*) AS blocks, MAX(updated_at) AS updated_at
        FROM content_blocks GROUP BY page ORDER BY page
      `)
      .all();
  },
  { permission: 'content.read' },
);

/**
 * Bulk-saves edited blocks. Accepts an array so a whole page's copy is written
 * in one transaction — a partial save would leave the page inconsistent.
 */
const bulkSchema = z.object({ blocks: z.array(contentBlockSchema).min(1).max(200) });

export const PUT = withAdminApi(
  async ({ req, audit, session }) => {
    const body = await req.json().catch(() => null);
    const parsed = bulkSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, 'Invalid content payload.', 'invalid', fieldErrors(parsed.error));
    }

    const db = getDb();
    const t = now();
    // updated_by marks the block as administrator-edited, which stops the
    // seed script from ever overwriting it again.
    const stmt = db.prepare(`
      UPDATE content_blocks SET value = ?, updated_by = ?, updated_at = ?
      WHERE page = ? AND block_key = ?
    `);

    let changed = 0;
    db.transaction(() => {
      for (const b of parsed.data.blocks) {
        changed += stmt.run(b.value, session.user.id, t, b.page, b.block_key).changes;
      }
    })();

    audit('content.update', 'content_blocks', undefined, {
      count: changed,
      pages: [...new Set(parsed.data.blocks.map((b) => b.page))],
    });
    return { updated: changed };
  },
  { permission: 'content.write' },
);
