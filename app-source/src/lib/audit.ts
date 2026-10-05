import { getDb, now } from '@/lib/db/client';

/**
 * Append-only audit trail for administrative actions.
 *
 * The actor's email is denormalised alongside the user id so history stays
 * readable after an account is deleted. Writes never throw into the caller —
 * a failed audit insert must not break the operation being audited, but it is
 * logged loudly server-side.
 */

export interface AuditEntry {
  userId?: number | null;
  actorEmail?: string;
  action: string;
  entity?: string;
  entityId?: string;
  meta?: unknown;
  ipHash?: string;
}

/** Keys whose values are redacted before an audit record is written. */
const SENSITIVE = /password|token|secret|hash|csrf|authorization|cookie/i;

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4 || value == null) return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => redact(v, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE.test(k) ? '[redacted]' : redact(v, depth + 1);
    }
    return out;
  }
  if (typeof value === 'string' && value.length > 500) return `${value.slice(0, 500)}…`;
  return value;
}

export function writeAudit(entry: AuditEntry): void {
  try {
    getDb()
      .prepare(`
        INSERT INTO audit_logs (user_id, actor_email, action, entity, entity_id, meta, ip_hash, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        entry.userId ?? null,
        entry.actorEmail ?? null,
        entry.action,
        entry.entity ?? null,
        entry.entityId ?? null,
        JSON.stringify(redact(entry.meta ?? {})),
        entry.ipHash ?? null,
        now(),
      );
  } catch (err) {
    console.error('[audit] failed to write entry', entry.action, err);
  }
}

export interface AuditRow {
  id: number;
  actorEmail: string | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  meta: string;
  createdAt: number;
}

export function readAudit(limit = 100, offset = 0): AuditRow[] {
  const rows = getDb()
    .prepare(`
      SELECT id, actor_email, action, entity, entity_id, meta, created_at
      FROM audit_logs ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?
    `)
    .all(Math.min(limit, 500), offset) as Record<string, unknown>[];

  return rows.map((r) => ({
    id: Number(r.id),
    actorEmail: (r.actor_email as string) ?? null,
    action: String(r.action),
    entity: (r.entity as string) ?? null,
    entityId: (r.entity_id as string) ?? null,
    meta: String(r.meta ?? '{}'),
    createdAt: Number(r.created_at),
  }));
}

export function countAudit(): number {
  return (getDb().prepare('SELECT COUNT(*) c FROM audit_logs').get() as { c: number }).c;
}
