import { getDb, now } from '@/lib/db/client';

/**
 * Fixed-window rate limiter backed by SQLite so limits survive a restart and
 * are shared across workers, unlike an in-process bucket.
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Unix seconds when the caller may retry. */
  retryAfter: number;
  limit: number;
}

export interface RateLimitOptions {
  /** Logical bucket name, e.g. 'login' or 'inquiry'. */
  key: string;
  /** Caller identity — normally an IP hash. */
  identity: string;
  limit: number;
  windowSeconds: number;
  /**
   * When set, exceeding the limit blocks for this long instead of until the
   * end of the window. Used to make credential stuffing expensive.
   */
  blockSeconds?: number;
}

export function rateLimit(opts: RateLimitOptions): RateLimitResult {
  const db = getDb();
  const bucket = `${opts.key}:${opts.identity}`;
  const t = now();

  // A single transaction so concurrent requests cannot both read a stale count.
  const run = db.transaction((): RateLimitResult => {
    const row = db
      .prepare('SELECT hits, window_start, blocked_until FROM rate_limits WHERE bucket = ?')
      .get(bucket) as { hits: number; window_start: number; blocked_until: number | null } | undefined;

    if (row?.blocked_until && row.blocked_until > t) {
      return { allowed: false, remaining: 0, retryAfter: row.blocked_until, limit: opts.limit };
    }

    const windowExpired = !row || t - row.window_start >= opts.windowSeconds;

    if (windowExpired) {
      db.prepare(`
        INSERT INTO rate_limits (bucket, hits, window_start, blocked_until)
        VALUES (?, 1, ?, NULL)
        ON CONFLICT(bucket) DO UPDATE SET hits = 1, window_start = excluded.window_start, blocked_until = NULL
      `).run(bucket, t);
      return {
        allowed: true,
        remaining: opts.limit - 1,
        retryAfter: t + opts.windowSeconds,
        limit: opts.limit,
      };
    }

    const hits = row.hits + 1;
    const exceeded = hits > opts.limit;
    const blockedUntil = exceeded && opts.blockSeconds ? t + opts.blockSeconds : null;

    db.prepare('UPDATE rate_limits SET hits = ?, blocked_until = ? WHERE bucket = ?').run(
      hits,
      blockedUntil,
      bucket,
    );

    return {
      allowed: !exceeded,
      remaining: Math.max(0, opts.limit - hits),
      retryAfter: blockedUntil ?? row.window_start + opts.windowSeconds,
      limit: opts.limit,
    };
  });

  return run();
}

/** Clears a bucket — called after a successful login so one failure streak does not linger. */
export function resetRateLimit(key: string, identity: string): void {
  getDb().prepare('DELETE FROM rate_limits WHERE bucket = ?').run(`${key}:${identity}`);
}

/** Housekeeping: drop windows that expired long ago. */
export function pruneRateLimits(olderThanSeconds = 86_400): number {
  const res = getDb()
    .prepare('DELETE FROM rate_limits WHERE window_start < ? AND (blocked_until IS NULL OR blocked_until < ?)')
    .run(now() - olderThanSeconds, now());
  return res.changes;
}

/** Standard headers so clients can back off politely. */
export function rateLimitHeaders(r: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(r.limit),
    'X-RateLimit-Remaining': String(r.remaining),
    'X-RateLimit-Reset': String(r.retryAfter),
  };
  if (!r.allowed) headers['Retry-After'] = String(Math.max(1, r.retryAfter - now()));
  return headers;
}
