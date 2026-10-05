import { redirect } from 'next/navigation';

import { UsersManager } from '@/components/admin/UsersManager';
import { PageHeader } from '@/components/admin/ui';
import { adminListRoles, adminListUsers } from '@/lib/admin/queries';
import { pageSession } from '@/lib/auth/guard';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const session = await pageSession('users.read');
  if (!session) redirect('/admin');

  return (
    <>
      <PageHeader
        title="Users"
        description="Administrator accounts and their roles. Passwords are stored hashed with scrypt and are never recoverable — a forgotten password is replaced, not retrieved."
      />
      <UsersManager users={adminListUsers()} roles={adminListRoles()} />
    </>
  );
}
