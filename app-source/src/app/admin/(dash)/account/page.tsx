import { redirect } from 'next/navigation';

import { PasswordForm } from '@/components/admin/PasswordForm';
import { Card, PageHeader, formatDate } from '@/components/admin/ui';
import { pageSession } from '@/lib/auth/guard';
import { describePermissions } from '@/lib/auth/rbac';
import { getDb } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const session = await pageSession();
  if (!session) redirect('/admin/login');

  const sessions = getDb()
    .prepare(`
      SELECT id, created_at, last_seen_at, expires_at
      FROM sessions WHERE user_id = ? AND revoked_at IS NULL AND expires_at > strftime('%s','now')
      ORDER BY last_seen_at DESC
    `)
    .all(session.user.id) as { id: string; created_at: number; last_seen_at: number; expires_at: number }[];

  return (
    <>
      <PageHeader title="My account" description={session.user.email} />

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-8">
          <Card>
            <h2 className="tech-label mb-5">Change password</h2>
            {session.user.mustChangePassword && (
              <p className="mb-5 border border-standby/40 bg-standby/10 p-3 text-xs text-standby">
                Your password was generated for you. Change it now to unlock the rest of the back office.
              </p>
            )}
            <PasswordForm />
          </Card>
        </div>

        <div className="space-y-8">
          <Card>
            <h2 className="tech-label mb-5">Role &amp; permissions</h2>
            <p className="mb-4 font-display text-lg font-semibold uppercase tracking-tight text-chalk">
              {session.user.roleName}
            </p>
            <ul className="space-y-2">
              {describePermissions(session.user.permissions).map((p) => (
                <li key={p} className="flex gap-3 text-sm text-mist">
                  <span aria-hidden className="mt-[0.55em] block h-px w-3 shrink-0 bg-signal" />
                  {p}
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <h2 className="tech-label mb-5">Active sessions</h2>
            <ul className="space-y-3">
              {sessions.map((s) => (
                <li key={s.id} className="flex flex-wrap justify-between gap-3 border-b border-hairline pb-3 last:border-0">
                  <span className="text-xs text-mist">
                    {s.id === session.sessionId ? 'This device' : 'Other device'}
                  </span>
                  <span className="text-xs text-muted">
                    Last seen {formatDate(s.last_seen_at)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted">
              Changing your password signs out every other device immediately.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
