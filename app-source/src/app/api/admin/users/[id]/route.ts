import { ApiError, withAdminApi } from '@/lib/auth/guard';
import { parseIdFromUrl } from '@/lib/admin/resource';
import { revokeAllUserSessions } from '@/lib/auth/session';
import { getDb, now } from '@/lib/db/client';
import { fieldErrors, userSchema } from '@/lib/validation/schemas';

export const dynamic = 'force-dynamic';

/** Counts remaining enabled Super Admins, used to prevent lock-out. */
function activeSuperAdmins(excludeUserId?: number): number {
  const row = getDb()
    .prepare(`
      SELECT COUNT(*) c FROM users u JOIN roles r ON r.id = u.role_id
      WHERE r.slug = 'super_admin' AND u.is_active = 1 AND u.id != ?
    `)
    .get(excludeUserId ?? -1) as { c: number };
  return row.c;
}

export const PUT = withAdminApi(
  async ({ req, audit, session }) => {
    const id = parseIdFromUrl(req);
    const body = await req.json().catch(() => null);
    const parsed = userSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, 'Check the highlighted fields.', 'invalid', fieldErrors(parsed.error));
    }
    const d = parsed.data;
    const db = getDb();

    const existing = db
      .prepare(`
        SELECT u.id, u.email, u.is_active, r.slug AS role_slug
        FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ?
      `)
      .get(id) as { id: number; email: string; is_active: number; role_slug: string } | undefined;
    if (!existing) throw new ApiError(404, 'User not found.', 'not_found');

    const emailKey = d.email.toLowerCase();
    const clash = db.prepare('SELECT id FROM users WHERE email_key = ? AND id != ?').get(emailKey, id);
    if (clash) {
      throw new ApiError(409, 'An account with that email already exists.', 'conflict', {
        email: 'Already in use.',
      });
    }

    const newRole = db.prepare('SELECT id, slug FROM roles WHERE id = ?').get(d.role_id) as
      | { id: number; slug: string }
      | undefined;
    if (!newRole) throw new ApiError(400, 'Unknown role.', 'invalid', { role_id: 'Unknown role.' });

    // Never allow the last Super Admin to be demoted or deactivated — that
    // would leave nobody able to administer the system.
    const losingSuper =
      existing.role_slug === 'super_admin' && (newRole.slug !== 'super_admin' || !d.is_active);
    if (losingSuper && activeSuperAdmins(id) === 0) {
      throw new ApiError(
        409,
        'This is the last active Super Admin. Promote another account first.',
        'last_super_admin',
      );
    }

    db.prepare(`
      UPDATE users SET email = ?, email_key = ?, name = ?, role_id = ?, is_active = ?, updated_at = ?
      WHERE id = ?
    `).run(d.email, emailKey, d.name, d.role_id, d.is_active ? 1 : 0, now(), id);

    // Deactivating or changing someone's role invalidates their live sessions
    // immediately rather than at the next expiry.
    if (!d.is_active || newRole.slug !== existing.role_slug) {
      revokeAllUserSessions(id, id === session.user.id ? session.sessionId : undefined);
    }

    audit('user.update', 'users', id, { email: d.email, roleId: d.role_id, active: d.is_active });
    return { id };
  },
  { permission: 'users.write' },
);

export const DELETE = withAdminApi(
  async ({ req, audit, session }) => {
    const id = parseIdFromUrl(req);

    if (id === session.user.id) {
      throw new ApiError(409, 'You cannot delete your own account.', 'self_delete');
    }

    const db = getDb();
    const user = db
      .prepare(`
        SELECT u.id, u.email, r.slug AS role_slug FROM users u
        JOIN roles r ON r.id = u.role_id WHERE u.id = ?
      `)
      .get(id) as { id: number; email: string; role_slug: string } | undefined;
    if (!user) throw new ApiError(404, 'User not found.', 'not_found');

    if (user.role_slug === 'super_admin' && activeSuperAdmins(id) === 0) {
      throw new ApiError(409, 'This is the last active Super Admin.', 'last_super_admin');
    }

    // Sessions cascade; audit rows keep actor_email so history stays readable.
    db.prepare('DELETE FROM users WHERE id = ?').run(id);

    audit('user.delete', 'users', id, { email: user.email });
    return { deleted: id };
  },
  { permission: 'users.write' },
);
