import { redirect } from 'next/navigation';

import { AdminShell } from '@/components/admin/AdminShell';
import { issueCsrfToken } from '@/lib/auth/csrf';
import { getSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

/**
 * Guarded back-office shell.
 *
 * This is the page-level gate. It is defence in depth, NOT the security
 * boundary: every admin API route independently re-checks the session and the
 * required permission, because a page guard cannot protect an endpoint that is
 * called directly.
 */
export default async function DashLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/admin/login');

  // A user under forced password rotation can reach only the account page.
  // The API guard enforces the same rule for every endpoint.
  const csrfToken = issueCsrfToken(session.csrfSecret);

  return (
    <AdminShell
      user={{
        name: session.user.name,
        email: session.user.email,
        roleName: session.user.roleName,
        permissions: session.user.permissions,
        mustChangePassword: session.user.mustChangePassword,
      }}
      csrfToken={csrfToken}
    >
      {children}
    </AdminShell>
  );
}
