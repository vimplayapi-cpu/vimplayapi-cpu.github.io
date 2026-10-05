import { createHash, randomBytes } from 'node:crypto';

/**
 * Server-side configuration.
 *
 * Nothing in this module may be imported from a client component: it resolves
 * the application secret used for IP hashing, analytics salts and CSRF tokens.
 */

const isProd = process.env.NODE_ENV === 'production';

/**
 * In production the secret must be supplied. In development we derive a stable
 * per-boot value so the app runs out of the box without inventing a
 * "default secret" that could silently ship to production.
 */
function resolveSecret(): string {
  const provided = process.env.LM_APP_SECRET;
  if (provided && provided.length >= 32) return provided;

  if (isProd) {
    throw new Error(
      'LM_APP_SECRET must be set to a random string of at least 32 characters in production. ' +
        'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64url\'))"',
    );
  }
  if (provided) {
    console.warn('[live-miracle] LM_APP_SECRET is shorter than 32 chars — using a dev-only value.');
  }
  return `dev-only-${randomBytes(24).toString('hex')}`;
}

let cachedSecret: string | null = null;

export function appSecret(): string {
  if (!cachedSecret) cachedSecret = resolveSecret();
  return cachedSecret;
}

export const IS_PROD = isProd;

/** Absolute site URL used for canonical tags, sitemap and OG metadata. */
export function siteUrl(): string {
  const raw =
    process.env.LM_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');
  const trimmed = raw.replace(/\/+$/, '');
  return trimmed || 'http://localhost:3000';
}

/**
 * Salted digest used wherever a value must be correlatable but not reversible
 * (IP addresses on rate-limit buckets and lead records).
 */
export function stableHash(value: string, scope = 'general'): string {
  return createHash('sha256').update(`${appSecret()}:${scope}:${value}`).digest('hex').slice(0, 32);
}

/**
 * Daily-rotating visitor digest for analytics. Because the salt includes the
 * date, the same visitor produces a different hash tomorrow, so the analytics
 * table cannot be used to follow anyone over time.
 */
export function dailyVisitorHash(ip: string, userAgent: string, day: string): string {
  return createHash('sha256')
    .update(`${appSecret()}:visitor:${day}:${ip}:${userAgent}`)
    .digest('hex')
    .slice(0, 24);
}
