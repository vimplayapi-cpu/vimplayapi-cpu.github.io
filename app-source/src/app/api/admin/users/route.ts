import { NextResponse } from 'next/server';

import { ApiError, withAdminApi } from '@/lib/auth/guard';
import { adminListRoles, adminListUsers } from '@/lib/admin/queries';
import { checkPasswordStrength, hashPassword, randomToken } from '@/lib/auth/password';
import { getDb, now } from '@/lib/db/client';
import { fieldErrors, userSchema } from '@/lib/validation/schemas';

export const dynamic = 'force-dynamic';

export const GET = withAdminApi(
  () => ({ users: adminListUsers(), roles: adminListRoles() }),
  { permission: 'users.read' },
);

/**
 * Creates an administrator account.
 *
 * The generated password is returned exactly once so the creator can hand it
 * over, and the account is flagged for mandatory rotation at first sign-in.
 * It is never written to the audit log.
 */
export const POST = withAdminApi(
  async ({ req, audit }) => {
    const body = await req.json().catch(() => null);
    const parsed = userSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, 'Check the highlighted fields.', 'invalid', fieldErrors(parsed.error));
    }
    const d = parsed.data;
    const db = getDb();

    const emailKey = d.email.toLowerCase();
    if (db.prepare('SELECT id FROM users WHERE email_key = ?').get(emailKey)) {
      throw new ApiError(409, 'An account with that email already exists.', 'conflict', {
        email: 'Already in use.',
      });
    }

    const role = db.prepare('SELECT id FROM roles WHERE id = ?').get(d.role_id);
    if (!role) throw new ApiError(400, 'Unknown role.', 'invalid', { role_id: 'Unknown role.' });

    const generated = !d.password;
    const password = d.password ?? `${randomToken(12)}Aa1!`;

    if (!generated) {
      const strength = checkPasswordStrength(password);
      if (!strength.ok) {
        throw new ApiError(400, 'Choose a stronger password.', 'weak_password', {
          password: strength.errors.join(' '),
        });
      }
    }

    const t = now();
    const result = db
      .prepare(`
        INSERT INTO users (email, email_key, name, password_hash, role_id, is_active,
                           must_change_pw, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
      `)
      .run(d.email, emailKey, d.name, await hashPassword(password), d.role_id, d.is_active ? 1 : 0, t, t);

    const id = Number(result.lastInsertRowid);
    audit('user.create', 'users', id, { email: d.email, roleId: d.role_id });

    return NextResponse.json(
      // The plaintext is echoed once and never stored or logged.
      { ok: true, data: { id, temporaryPassword: password } },
      { status: 201 },
    );
  },
  { permission: 'users.write' },
);
