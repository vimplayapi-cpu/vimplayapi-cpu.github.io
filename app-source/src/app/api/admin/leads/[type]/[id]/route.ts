import { ApiError, withAdminApi } from '@/lib/auth/guard';
import { getDb, now, parseJson } from '@/lib/db/client';
import { fieldErrors, leadUpdateSchema } from '@/lib/validation/schemas';

export const dynamic = 'force-dynamic';

/**
 * Inquiry and demo-request records.
 *
 * Lead data is the most sensitive content in the system — it is other people's
 * contact details. Access requires an authenticated administrator holding the
 * leads permission; there is no public read path to any of it, and the table
 * name is resolved from a fixed allow-list rather than interpolated from the
 * URL segment.
 */
const TABLES = {
  inquiries: { table: 'inquiries', emailColumn: 'email', nameColumn: 'full_name' },
  'demo-requests': { table: 'demo_requests', emailColumn: 'business_email', nameColumn: 'name' },
} as const;

type LeadType = keyof typeof TABLES;

function resolve(req: Request): { table: string; id: number } {
  const segments = new URL(req.url).pathname.split('/').filter(Boolean);
  const id = Number(segments[segments.length - 1]);
  const type = segments[segments.length - 2] as LeadType;

  if (!Number.isInteger(id) || id <= 0) throw new ApiError(400, 'Invalid id.', 'invalid');
  const config = TABLES[type];
  if (!config) throw new ApiError(404, 'Unknown lead type.', 'not_found');

  return { table: config.table, id };
}

export const GET = withAdminApi(
  ({ req, audit }) => {
    const { table, id } = resolve(req);
    const row = getDb().prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id) as
      | Record<string, unknown>
      | undefined;
    if (!row) throw new ApiError(404, 'Not found.', 'not_found');

    // Reading someone's contact details is itself worth recording.
    audit('lead.read', table, id);

    // ip_hash and user_agent stay server-side; they exist for abuse handling,
    // not for display, and are never sent to the browser.
    const { ip_hash: _ip, user_agent: _ua, ...safe } = row;
    if (typeof safe.required_services === 'string') {
      safe.required_services = parseJson<string[]>(safe.required_services, []);
    }
    return safe;
  },
  { permission: 'leads.read' },
);

export const PATCH = withAdminApi(
  async ({ req, audit, session }) => {
    const { table, id } = resolve(req);
    const body = await req.json().catch(() => null);
    const parsed = leadUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, 'Invalid update.', 'invalid', fieldErrors(parsed.error));
    }

    const db = getDb();
    if (!db.prepare(`SELECT id FROM ${table} WHERE id = ?`).get(id)) {
      throw new ApiError(404, 'Not found.', 'not_found');
    }

    db.prepare(`
      UPDATE ${table} SET status = ?, internal_notes = ?, handled_by = ?, handled_at = ?
      WHERE id = ?
    `).run(parsed.data.status, parsed.data.internal_notes, session.user.id, now(), id);

    audit('lead.update', table, id, { status: parsed.data.status });
    return { id, status: parsed.data.status };
  },
  { permission: 'leads.write' },
);

export const DELETE = withAdminApi(
  async ({ req, audit }) => {
    const { table, id } = resolve(req);
    const db = getDb();
    if (!db.prepare(`SELECT id FROM ${table} WHERE id = ?`).get(id)) {
      throw new ApiError(404, 'Not found.', 'not_found');
    }

    db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
    // The audit entry deliberately records no personal data — only that a
    // record with this id was removed, and by whom.
    audit('lead.delete', table, id);
    return { deleted: id };
  },
  { permission: 'leads.delete' },
);
