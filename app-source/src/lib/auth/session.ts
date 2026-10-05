import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { cache } from 'react';

import { getDb, now, parseJson } from '@/lib/db/client';
import { IS_PROD } from '@/lib/env';
import { randomToken } from './password';

/**
 * Server-side session management.
 *
 * The cookie carries `<sessionId>.<secret>`. Only a SHA-256 digest of the
 * secret is stored, so read access to the database does not allow an attacker
 * to mint a working cookie. Session records also carry a per-session CSRF
 * secret used by the double-submit check.
 */

export const SESSION_COOKIE = '__Host-lm_session';
/** Absolute lifetime; a session cannot be extended past this. */
export const SESSION_MAX_AGE_S = 60 * 60 * 8;
/** Idle timeout — a session unused for this long is rejected. */
export const SESSION_IDLE_S = 60 * 60 * 2;

export interface SessionUser {
  id: number;
  email: string;
  name: string;
  roleSlug: string;
  roleName: string;
  permissions: string[];
  mustChangePassword: boolean;
}

export interface ActiveSession {
  sessionId: string;
  csrfSecret: string;
  user: SessionUser;
  expiresAt: number;
}

const digest = (secret: string): string => createHash('sha256').update(secret).digest('hex');

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}

/**
 * Cookie attributes. The __Host- prefix requires Secure + Path=/ and no Domain,
 * which pins the cookie to the exact origin. In development over plain HTTP the
 * prefix cannot be used, so the name falls back automatically.
 */
export function sessionCookieName(): string {
  return IS_PROD ? SESSION_COOKIE : 'lm_session';
}

export function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

export function createSession(
  userId: number,
  meta: { ipHash?: string; userAgent?: string } = {},
): { cookieValue: string; expiresAt: number; csrfSecret: string } {
  const db = getDb();
  const t = now();
  const sessionId = randomUUID();
  const secret = randomToken(32);
  const csrfSecret = randomToken(32);
  const expiresAt = t + SESSION_MAX_AGE_S;

  db.prepare(`
    INSERT INTO sessions (id, user_id, token_hash, csrf_secret, ip_hash, user_agent,
                          created_at, last_seen_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    sessionId, userId, digest(secret), csrfSecret,
    meta.ipHash ?? null, (meta.userAgent ?? '').slice(0, 255),
    t, t, expiresAt,
  );

  return { cookieValue: `${sessionId}.${secret}`, expiresAt, csrfSecret };
}

/**
 * Resolves the current session from the cookie.
 *
 * Wrapped in React's `cache` so repeated calls within one request hit the
 * database once. Returns null for any failure — expired, revoked, idle-timed
 * out, deactivated user, or a tampered cookie.
 */
export const getSession = cache(async (): Promise<ActiveSession | null> => {
  const jar = await cookies();
  const raw = jar.get(sessionCookieName())?.value;
  if (!raw) return null;

  const sep = raw.indexOf('.');
  if (sep <= 0) return null;
  const sessionId = raw.slice(0, sep);
  const secret = raw.slice(sep + 1);
  if (!sessionId || !secret) return null;

  const db = getDb();
  const row = db
    .prepare(`
      SELECT s.id, s.token_hash, s.csrf_secret, s.expires_at, s.last_seen_at, s.revoked_at,
             u.id AS user_id, u.email, u.name, u.is_active, u.must_change_pw,
             r.slug AS role_slug, r.name AS role_name, r.permissions
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      JOIN roles r ON r.id = u.role_id
      WHERE s.id = ?
    `)
    .get(sessionId) as Record<string, unknown> | undefined;

  if (!row) return null;

  const t = now();
  if (row.revoked_at != null) return null;
  if (Number(row.expires_at) <= t) return null;
  if (t - Number(row.last_seen_at) > SESSION_IDLE_S) return null;
  if (Number(row.is_active) !== 1) return null;
  if (!safeEqualHex(digest(secret), String(row.token_hash))) return null;

  // Touch last_seen_at at most once a minute to avoid a write per request.
  if (t - Number(row.last_seen_at) > 60) {
    db.prepare('UPDATE sessions SET last_seen_at = ? WHERE id = ?').run(t, sessionId);
  }

  return {
    sessionId,
    csrfSecret: String(row.csrf_secret),
    expiresAt: Number(row.expires_at),
    user: {
      id: Number(row.user_id),
      email: String(row.email),
      name: String(row.name),
      roleSlug: String(row.role_slug),
      roleName: String(row.role_name),
      permissions: parseJson<string[]>(String(row.permissions ?? '[]'), []),
      mustChangePassword: Number(row.must_change_pw) === 1,
    },
  };
});

export function revokeSession(sessionId: string): void {
  getDb().prepare('UPDATE sessions SET revoked_at = ? WHERE id = ?').run(now(), sessionId);
}

/** Used when a password changes — every other session for the user is killed. */
export function revokeAllUserSessions(userId: number, exceptSessionId?: string): number {
  const res = getDb()
    .prepare('UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL AND id != ?')
    .run(now(), userId, exceptSessionId ?? '');
  return res.changes;
}

/** Housekeeping: remove sessions that expired more than a day ago. */
export function pruneSessions(): number {
  return getDb().prepare('DELETE FROM sessions WHERE expires_at < ?').run(now() - 86_400).changes;
}
