import { NextResponse } from 'next/server';
import type { z } from 'zod';

import { ApiError, withAdminApi } from '@/lib/auth/guard';
import { getDb, now } from '@/lib/db/client';
import { fieldErrors, reorderSchema } from '@/lib/validation/schemas';

/**
 * Factory for the simple ordered CMS collections (services, locations,
 * timeline entries, gallery items).
 *
 * Each generated handler goes through `withAdminApi`, so authentication, CSRF,
 * same-origin and permission checks are applied identically everywhere — there
 * is no route that can accidentally skip them.
 */

export interface ResourceConfig<S extends z.ZodTypeAny> {
  /** Table name. Interpolated into SQL, so it must never come from a request. */
  table: string;
  /** Audit prefix, e.g. 'service'. */
  name: string;
  schema: S;
  /** Maps validated input to column values. */
  toRow: (data: z.infer<S>) => Record<string, unknown>;
  /** Columns selected when listing. */
  listSql: string;
  /** Unique column checked before insert/update, if any. */
  uniqueColumn?: string;
  /** Whether the table has sort_order / is_published / updated_at columns. */
  hasSortOrder?: boolean;
  hasPublished?: boolean;
  hasTimestamps?: boolean;
}

export function parseIdFromUrl(req: Request): number {
  const segments = new URL(req.url).pathname.split('/').filter(Boolean);
  const id = Number(segments[segments.length - 1]);
  if (!Number.isInteger(id) || id <= 0) throw new ApiError(400, 'Invalid id.', 'invalid');
  return id;
}

export function makeCollectionRoutes<S extends z.ZodTypeAny>(config: ResourceConfig<S>) {
  const GET = withAdminApi(() => getDb().prepare(config.listSql).all(), {
    permission: 'content.read',
  });

  const POST = withAdminApi(
    async ({ req, audit }) => {
      const body = await req.json().catch(() => null);
      const parsed = config.schema.safeParse(body);
      if (!parsed.success) {
        throw new ApiError(400, 'Check the highlighted fields.', 'invalid', fieldErrors(parsed.error));
      }

      const db = getDb();
      const row = config.toRow(parsed.data);

      if (config.uniqueColumn) {
        const value = row[config.uniqueColumn];
        const clash = db
          .prepare(`SELECT id FROM ${config.table} WHERE ${config.uniqueColumn} = ?`)
          .get(value);
        if (clash) {
          throw new ApiError(409, 'That value is already in use.', 'conflict', {
            [config.uniqueColumn]: 'Already in use.',
          });
        }
      }

      const t = now();
      if (config.hasSortOrder) {
        row.sort_order =
          (db.prepare(`SELECT COALESCE(MAX(sort_order), -1) AS m FROM ${config.table}`).get() as {
            m: number;
          }).m + 1;
      }
      if (config.hasTimestamps) {
        row.created_at = t;
        row.updated_at = t;
      }

      const cols = Object.keys(row);
      const result = db
        .prepare(
          `INSERT INTO ${config.table} (${cols.join(', ')}) VALUES (${cols.map((c) => `@${c}`).join(', ')})`,
        )
        .run(row);

      const id = Number(result.lastInsertRowid);
      audit(`${config.name}.create`, config.table, id);
      return NextResponse.json({ ok: true, data: { id } }, { status: 201 });
    },
    { permission: 'content.write' },
  );

  const PATCH = config.hasSortOrder
    ? withAdminApi(
        async ({ req, audit }) => {
          const body = await req.json().catch(() => null);
          const parsed = reorderSchema.safeParse(body);
          if (!parsed.success) throw new ApiError(400, 'Invalid order payload.', 'invalid');

          const db = getDb();
          const sql = config.hasTimestamps
            ? `UPDATE ${config.table} SET sort_order = ?, updated_at = ? WHERE id = ?`
            : `UPDATE ${config.table} SET sort_order = ? WHERE id = ?`;
          const stmt = db.prepare(sql);
          const t = now();

          db.transaction(() => {
            parsed.data.ids.forEach((id, i) =>
              config.hasTimestamps ? stmt.run(i, t, id) : stmt.run(i, id),
            );
          })();

          audit(`${config.name}.reorder`, config.table, undefined, { count: parsed.data.ids.length });
          return { reordered: parsed.data.ids.length };
        },
        { permission: 'content.write' },
      )
    : undefined;

  return { GET, POST, PATCH };
}

export function makeItemRoutes<S extends z.ZodTypeAny>(config: ResourceConfig<S>) {
  const GET = withAdminApi(
    ({ req }) => {
      const id = parseIdFromUrl(req);
      const row = getDb().prepare(`SELECT * FROM ${config.table} WHERE id = ?`).get(id);
      if (!row) throw new ApiError(404, 'Not found.', 'not_found');
      return row;
    },
    { permission: 'content.read' },
  );

  const PUT = withAdminApi(
    async ({ req, audit, session }) => {
      const id = parseIdFromUrl(req);
      const body = await req.json().catch(() => null);
      const parsed = config.schema.safeParse(body);
      if (!parsed.success) {
        throw new ApiError(400, 'Check the highlighted fields.', 'invalid', fieldErrors(parsed.error));
      }

      const db = getDb();
      const existing = db.prepare(`SELECT * FROM ${config.table} WHERE id = ?`).get(id) as
        | Record<string, unknown>
        | undefined;
      if (!existing) throw new ApiError(404, 'Not found.', 'not_found');

      const row = config.toRow(parsed.data);

      if (config.uniqueColumn) {
        const clash = db
          .prepare(`SELECT id FROM ${config.table} WHERE ${config.uniqueColumn} = ? AND id != ?`)
          .get(row[config.uniqueColumn], id);
        if (clash) {
          throw new ApiError(409, 'That value is already in use.', 'conflict', {
            [config.uniqueColumn]: 'Already in use.',
          });
        }
      }

      // Publishing is gated behind its own permission.
      if (config.hasPublished && 'is_published' in row) {
        const changing = Number(existing.is_published) !== Number(row.is_published);
        const perms = session.user.permissions;
        if (changing && !perms.includes('super') && !perms.includes('content.publish')) {
          throw new ApiError(403, 'You do not have permission to publish or unpublish.', 'forbidden');
        }
      }

      if (config.hasTimestamps) row.updated_at = now();

      const cols = Object.keys(row);
      db.prepare(
        `UPDATE ${config.table} SET ${cols.map((c) => `${c} = @${c}`).join(', ')} WHERE id = @id`,
      ).run({ ...row, id });

      audit(`${config.name}.update`, config.table, id);
      return { id };
    },
    { permission: 'content.write' },
  );

  const DELETE = withAdminApi(
    async ({ req, audit }) => {
      const id = parseIdFromUrl(req);
      const db = getDb();
      const existing = db.prepare(`SELECT id FROM ${config.table} WHERE id = ?`).get(id);
      if (!existing) throw new ApiError(404, 'Not found.', 'not_found');

      db.prepare(`DELETE FROM ${config.table} WHERE id = ?`).run(id);
      audit(`${config.name}.delete`, config.table, id);
      return { deleted: id };
    },
    { permission: 'content.delete' },
  );

  return { GET, PUT, DELETE };
}
