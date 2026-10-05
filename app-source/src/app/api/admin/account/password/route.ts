import { NextResponse } from 'next/server';

import { ApiError, withAdminApi } from '@/lib/auth/guard';
import { checkPasswordStrength, hashPassword, verifyPassword } from '@/lib/auth/password';
import { revokeAllUserSessions } from '@/lib/auth/session';
import { getDb, now } from '@/lib/db/client';
import { fieldErrors, passwordChangeSchema } from '@/lib/validation/schemas';

export const dynamic = 'force-dynamic';

/**
 * Password rotation for the signed-in administrator.
 *
 * Deliberately reachable while `must_change_pw` is set — the guard exempts this
 * one path so a user forced to rotate can actually do so. Changing the password
 * revokes every other session for the account.
 */
export const POST = withAdminApi(
  async ({ session, req }) => {
    const body = await req.json().catch(() => null);
    const parsed = passwordChangeSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, 'Check your details.', 'invalid', fieldErrors(parsed.error));
    }

    const db = getDb();
    const row = db
      .prepare('SELECT password_hash FROM users WHERE id = ?')
      .get(session.user.id) as { password_hash: string } | undefined;
    if (!row) throw new ApiError(401, 'Account not found.', 'unauthenticated');

    if (!(await verifyPassword(parsed.data.current_password, row.password_hash))) {
      throw new ApiError(400, 'Your current password is incorrect.', 'invalid', {
        current_password: 'Your current password is incorrect.',
      });
    }

    const strength = checkPasswordStrength(parsed.data.new_password);
    if (!strength.ok) {
      throw new ApiError(400, 'Choose a stronger password.', 'weak_password', {
        new_password: strength.errors.join(' '),
      });
    }

    const hash = await hashPassword(parsed.data.new_password);
    db.prepare('UPDATE users SET password_hash = ?, must_change_pw = 0, updated_at = ? WHERE id = ?')
      .run(hash, now(), session.user.id);

    const revoked = revokeAllUserSessions(session.user.id, session.sessionId);

    return NextResponse.json({
      ok: true,
      data: { revokedOtherSessions: revoked },
    });
  },
  { audit: 'account.password.change', rateLimit: { key: 'password-change', limit: 5, windowSeconds: 900 } },
);
