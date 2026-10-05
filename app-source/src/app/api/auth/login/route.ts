import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { writeAudit } from '@/lib/audit';
import { verifyPassword } from '@/lib/auth/password';
import { createSession, sessionCookieName, sessionCookieOptions, SESSION_MAX_AGE_S } from '@/lib/auth/session';
import { getDb, now } from '@/lib/db/client';
import { rateLimit, rateLimitHeaders, resetRateLimit } from '@/lib/security/rate-limit';
import { ipHash, isSameOrigin, userAgent } from '@/lib/security/request';
import { fieldErrors, loginSchema } from '@/lib/validation/schemas';

export const dynamic = 'force-dynamic';

/** Progressive account lockout after repeated failures against one account. */
const MAX_ACCOUNT_ATTEMPTS = 8;
const ACCOUNT_LOCK_SECONDS = 15 * 60;

/**
 * Administrator sign-in.
 *
 * Failures are deliberately indistinguishable: unknown email, wrong password,
 * deactivated account and locked account all return the same message and take
 * a comparable amount of time, so the endpoint cannot be used to enumerate
 * valid administrator addresses.
 */
export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json(
      { ok: false, error: { code: 'bad_origin', message: 'Cross-origin request rejected.' } },
      { status: 403 },
    );
  }

  const ip = ipHash(req, 'login');

  // Two limits: a burst limit per IP, and a longer block once clearly abusive.
  const rl = rateLimit({
    key: 'login',
    identity: ip,
    limit: 10,
    windowSeconds: 15 * 60,
    blockSeconds: 30 * 60,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: { code: 'rate_limited', message: 'Too many attempts. Try again later.' } },
      { status: 429, headers: rateLimitHeaders(rl) },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: 'invalid', message: 'Check your details.', details: fieldErrors(parsed.error) } },
      { status: 400 },
    );
  }

  const { email, password } = parsed.data;
  const db = getDb();
  const t = now();

  const user = db
    .prepare(`
      SELECT id, email, password_hash, is_active, failed_attempts, locked_until, must_change_pw
      FROM users WHERE email_key = ?
    `)
    .get(email) as
    | {
        id: number;
        email: string;
        password_hash: string;
        is_active: number;
        failed_attempts: number;
        locked_until: number | null;
        must_change_pw: number;
      }
    | undefined;

  const genericFailure = NextResponse.json(
    { ok: false, error: { code: 'invalid_credentials', message: 'Email or password is incorrect.' } },
    { status: 401 },
  );

  // Always run a verification so the response time does not reveal whether the
  // account exists. The dummy hash is a real scrypt record that never matches.
  const DUMMY = 'scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
  const ok = await verifyPassword(password, user?.password_hash ?? DUMMY);

  if (!user || !ok || user.is_active !== 1 || (user.locked_until != null && user.locked_until > t)) {
    if (user) {
      const attempts = user.failed_attempts + 1;
      const lock = attempts >= MAX_ACCOUNT_ATTEMPTS ? t + ACCOUNT_LOCK_SECONDS : user.locked_until;
      db.prepare('UPDATE users SET failed_attempts = ?, locked_until = ?, updated_at = ? WHERE id = ?')
        .run(attempts >= MAX_ACCOUNT_ATTEMPTS ? 0 : attempts, lock, t, user.id);
      writeAudit({
        userId: user.id,
        actorEmail: user.email,
        action: 'auth.login.failed',
        meta: { attempts, locked: lock != null && lock > t },
        ipHash: ip,
      });
    } else {
      writeAudit({ action: 'auth.login.unknown_user', meta: {}, ipHash: ip });
    }
    return genericFailure;
  }

  // Success — clear counters and issue a session.
  db.prepare('UPDATE users SET failed_attempts = 0, locked_until = NULL, last_login_at = ?, updated_at = ? WHERE id = ?')
    .run(t, t, user.id);
  resetRateLimit('login', ip);

  const { cookieValue } = createSession(user.id, { ipHash: ip, userAgent: userAgent(req) });
  const jar = await cookies();
  jar.set(sessionCookieName(), cookieValue, sessionCookieOptions(SESSION_MAX_AGE_S));

  writeAudit({ userId: user.id, actorEmail: user.email, action: 'auth.login.success', ipHash: ip });

  return NextResponse.json({
    ok: true,
    data: { mustChangePassword: user.must_change_pw === 1, redirect: '/admin' },
  });
}
