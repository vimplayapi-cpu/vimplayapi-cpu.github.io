import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { writeAudit } from '@/lib/audit';
import { getSession, revokeSession, sessionCookieName } from '@/lib/auth/session';
import { ipHash, isSameOrigin } from '@/lib/security/request';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json(
      { ok: false, error: { code: 'bad_origin', message: 'Cross-origin request rejected.' } },
      { status: 403 },
    );
  }

  const session = await getSession();
  if (session) {
    revokeSession(session.sessionId);
    writeAudit({
      userId: session.user.id,
      actorEmail: session.user.email,
      action: 'auth.logout',
      ipHash: ipHash(req),
    });
  }

  // Clear the cookie regardless, so a stale or invalid cookie is also cleaned up.
  const jar = await cookies();
  jar.set(sessionCookieName(), '', { httpOnly: true, path: '/', maxAge: 0 });

  return NextResponse.json({ ok: true, data: { redirect: '/admin/login' } });
}
