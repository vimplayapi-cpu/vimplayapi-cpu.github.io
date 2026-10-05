import { createHmac, timingSafeEqual } from 'node:crypto';

import { appSecret } from '@/lib/env';

/**
 * CSRF protection using a signed double-submit token bound to the session.
 *
 * The token is derived from the session's own CSRF secret, so a token minted
 * for one session cannot be replayed against another. It is delivered to the
 * client in the page payload (never in a readable cookie) and returned in the
 * X-CSRF-Token header or an _csrf form field.
 */

export const CSRF_HEADER = 'x-csrf-token';
export const CSRF_FIELD = '_csrf';

export function issueCsrfToken(sessionCsrfSecret: string): string {
  return createHmac('sha256', appSecret()).update(sessionCsrfSecret).digest('base64url');
}

export function verifyCsrfToken(sessionCsrfSecret: string, presented: string | null | undefined): boolean {
  if (!presented) return false;
  const expected = issueCsrfToken(sessionCsrfSecret);
  if (expected.length !== presented.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(presented));
  } catch {
    return false;
  }
}

/** Pulls the token from either the header or a parsed form body. */
export function extractCsrf(req: Request, formValue?: FormDataEntryValue | null): string | null {
  const header = req.headers.get(CSRF_HEADER);
  if (header) return header;
  if (typeof formValue === 'string' && formValue) return formValue;
  return null;
}
