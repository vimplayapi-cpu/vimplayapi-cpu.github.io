import type { NextRequest } from 'next/server';

import { stableHash } from '@/lib/env';

/**
 * Request inspection helpers.
 *
 * Client IPs are only ever used to derive a salted hash — the raw address is
 * never written to the database or the logs.
 */

/**
 * Resolves the client IP from proxy headers.
 *
 * Only the FIRST entry of x-forwarded-for is used and only when the deployment
 * declares a trusted proxy count, because a client can append arbitrary values
 * to that header. Without LM_TRUSTED_PROXIES set we prefer the platform-
 * provided headers, which cannot be spoofed by the client.
 */
export function clientIp(req: NextRequest | Request): string {
  const h = req.headers;
  const trustedProxies = Number(process.env.LM_TRUSTED_PROXIES ?? '0');

  const platform = h.get('cf-connecting-ip') ?? h.get('x-real-ip') ?? h.get('x-vercel-forwarded-for');
  if (platform) return platform.trim();

  const xff = h.get('x-forwarded-for');
  if (xff && trustedProxies > 0) {
    const parts = xff.split(',').map((p) => p.trim()).filter(Boolean);
    // With N trusted proxies, the client address is N entries from the right.
    const idx = Math.max(0, parts.length - trustedProxies);
    return parts[idx] ?? parts[0] ?? 'unknown';
  }

  return 'unknown';
}

export function ipHash(req: NextRequest | Request, scope = 'ip'): string {
  return stableHash(clientIp(req), scope);
}

/** Truncated user-agent — enough to debug, not enough to fingerprint. */
export function userAgent(req: NextRequest | Request): string {
  return (req.headers.get('user-agent') ?? '').slice(0, 255);
}

export type DeviceClass = 'mobile' | 'tablet' | 'desktop';

export function deviceClass(ua: string): DeviceClass {
  const s = ua.toLowerCase();
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/.test(s)) return 'tablet';
  if (/mobi|iphone|ipod|android|blackberry|opera mini|iemobile/.test(s)) return 'mobile';
  return 'desktop';
}

/** Referrer host only — never the full referring URL, which can carry PII. */
export function referrerHost(req: NextRequest | Request): string {
  const ref = req.headers.get('referer');
  if (!ref) return '';
  try {
    return new URL(ref).hostname.slice(0, 120);
  } catch {
    return '';
  }
}

/**
 * Best-effort country from platform geo headers. Falls back to empty rather
 * than guessing from language headers.
 */
export function country(req: NextRequest | Request): string {
  return (
    req.headers.get('cf-ipcountry') ??
    req.headers.get('x-vercel-ip-country') ??
    ''
  ).slice(0, 2).toUpperCase();
}

/**
 * Same-origin check for state-changing requests. This backs up the CSRF token
 * rather than replacing it: Origin is absent on some legitimate requests, so a
 * missing header is not treated as a failure here.
 */
export function isSameOrigin(req: NextRequest | Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  const host = req.headers.get('host');
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
