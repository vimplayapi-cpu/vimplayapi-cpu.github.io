import { NextResponse } from 'next/server';

import { writeAudit } from '@/lib/audit';
import { rateLimit, rateLimitHeaders } from '@/lib/security/rate-limit';
import { ipHash, isSameOrigin, userAgent } from '@/lib/security/request';
import { extractCsrf, verifyCsrfToken } from './csrf';
import { hasPermission, type Permission } from './rbac';
import { getSession, type ActiveSession } from './session';

/**
 * Authorization gate for every admin API route.
 *
 * The rule this enforces (brief §29): authorization is resolved server-side
 * from the session record on every single request. No endpoint trusts a role
 * or permission supplied by the client in a header, body or cookie.
 */

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code = 'error',
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function jsonError(status: number, message: string, code = 'error', details?: unknown) {
  return NextResponse.json({ ok: false, error: { code, message, details } }, { status });
}

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export interface GuardOptions {
  /** Permission required to invoke the handler. Omit for any signed-in admin. */
  permission?: Permission;
  /**
   * Whether to enforce CSRF. Defaults to true for anything other than GET/HEAD.
   * There is no way to disable it for a state-changing method.
   */
  csrf?: boolean;
  /** Per-identity request ceiling for this endpoint. */
  rateLimit?: { key: string; limit: number; windowSeconds: number };
  /** Audit action name recorded on success, e.g. 'studio.update'. */
  audit?: string;
}

export interface GuardContext {
  session: ActiveSession;
  req: Request;
  /** Records an audit entry attributed to the authenticated user. */
  audit: (action: string, entity?: string, entityId?: string | number, meta?: unknown) => void;
}

type Handler<T> = (ctx: GuardContext) => Promise<T> | T;

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Wraps an admin route handler with authentication, authorization, CSRF,
 * same-origin and rate-limit checks. Any thrown ApiError becomes a clean JSON
 * response; anything else is logged server-side and returned as a generic 500
 * so internal details never reach the client.
 */
export function withAdminApi<T>(handler: Handler<T>, options: GuardOptions = {}) {
  return async (req: Request): Promise<NextResponse> => {
    const method = req.method.toUpperCase();
    const mutating = !SAFE_METHODS.has(method);

    try {
      // 1. Authentication — resolved from the signed session cookie.
      const session = await getSession();
      if (!session) throw new ApiError(401, 'Authentication required.', 'unauthenticated');

      // 2. Rate limiting, keyed to the user rather than the IP for admin work.
      if (options.rateLimit) {
        const rl = rateLimit({
          key: options.rateLimit.key,
          identity: String(session.user.id),
          limit: options.rateLimit.limit,
          windowSeconds: options.rateLimit.windowSeconds,
        });
        if (!rl.allowed) {
          return NextResponse.json(
            { ok: false, error: { code: 'rate_limited', message: 'Too many requests.' } },
            { status: 429, headers: rateLimitHeaders(rl) },
          );
        }
      }

      // 3. CSRF + same-origin on every state-changing request.
      const csrfRequired = options.csrf ?? mutating;
      if (csrfRequired && mutating) {
        if (!isSameOrigin(req)) {
          throw new ApiError(403, 'Cross-origin request rejected.', 'bad_origin');
        }
        let formValue: FormDataEntryValue | null = null;
        const contentType = req.headers.get('content-type') ?? '';
        // Only peek at the body for form posts; JSON bodies must use the header.
        if (!req.headers.get('x-csrf-token') && contentType.includes('form')) {
          const clone = req.clone();
          const form = await clone.formData().catch(() => null);
          formValue = form?.get('_csrf') ?? null;
        }
        if (!verifyCsrfToken(session.csrfSecret, extractCsrf(req, formValue))) {
          throw new ApiError(403, 'Invalid or missing CSRF token.', 'bad_csrf');
        }
      }

      // 4. A user forced to rotate their password may do nothing else.
      const path = new URL(req.url).pathname;
      if (session.user.mustChangePassword && !path.startsWith('/api/admin/account/password')) {
        throw new ApiError(403, 'Password change required before continuing.', 'password_change_required');
      }

      // 5. Authorization, read fresh from the database-backed session.
      if (options.permission && !hasPermission(session.user.permissions, options.permission)) {
        writeAudit({
          userId: session.user.id,
          actorEmail: session.user.email,
          action: 'authz.denied',
          entity: path,
          meta: { required: options.permission, role: session.user.roleSlug },
          ipHash: ipHash(req),
        });
        throw new ApiError(403, 'You do not have permission to perform this action.', 'forbidden');
      }

      const ctx: GuardContext = {
        session,
        req,
        audit: (action, entity, entityId, meta) =>
          writeAudit({
            userId: session.user.id,
            actorEmail: session.user.email,
            action,
            entity,
            entityId: entityId != null ? String(entityId) : undefined,
            meta,
            ipHash: ipHash(req),
          }),
      };

      const result = await handler(ctx);
      if (options.audit) ctx.audit(options.audit);

      return result instanceof NextResponse ? result : jsonOk(result);
    } catch (err) {
      if (err instanceof ApiError) {
        return jsonError(err.status, err.message, err.code, err.details);
      }
      console.error(`[admin-api] ${method} ${req.url}`, err);
      return jsonError(500, 'An unexpected error occurred.', 'internal');
    }
  };
}

/**
 * Guard for public (unauthenticated) API routes: same-origin plus rate
 * limiting, with the caller identified by a salted IP hash.
 */
export interface PublicRateLimit {
  key: string;
  limit: number;
  windowSeconds: number;
  blockSeconds?: number;
}

export function withPublicApi<T>(
  handler: (ctx: { req: Request; ip: string; ua: string }) => Promise<T> | T,
  options: {
    /**
     * Either a fixed config or a resolver invoked per request. Use the resolver
     * form when the limits are administrator-configurable, so a settings change
     * takes effect without a restart.
     */
    rateLimit?: PublicRateLimit | (() => PublicRateLimit);
  } = {},
) {
  return async (req: Request): Promise<NextResponse> => {
    try {
      if (!SAFE_METHODS.has(req.method.toUpperCase()) && !isSameOrigin(req)) {
        return jsonError(403, 'Cross-origin request rejected.', 'bad_origin');
      }

      const ip = ipHash(req);
      const limitConfig =
        typeof options.rateLimit === 'function' ? options.rateLimit() : options.rateLimit;
      if (limitConfig) {
        const rl = rateLimit({ ...limitConfig, identity: ip });
        if (!rl.allowed) {
          return NextResponse.json(
            {
              ok: false,
              error: { code: 'rate_limited', message: 'Too many submissions. Please try again later.' },
            },
            { status: 429, headers: rateLimitHeaders(rl) },
          );
        }
      }

      const result = await handler({ req, ip, ua: userAgent(req) });
      return result instanceof NextResponse ? result : jsonOk(result);
    } catch (err) {
      if (err instanceof ApiError) return jsonError(err.status, err.message, err.code, err.details);
      console.error(`[public-api] ${req.method} ${req.url}`, err);
      return jsonError(500, 'An unexpected error occurred.', 'internal');
    }
  };
}

/**
 * Page-level guard for admin server components. Returns the session or null;
 * callers redirect. Kept separate from the API guard so a page never leaks a
 * JSON error into an HTML response.
 */
export async function pageSession(required?: Permission): Promise<ActiveSession | null> {
  const session = await getSession();
  if (!session) return null;
  if (required && !hasPermission(session.user.permissions, required)) return null;
  return session;
}
