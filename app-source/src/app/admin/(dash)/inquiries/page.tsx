import { redirect } from 'next/navigation';

import { LeadsTable } from '@/components/admin/LeadsTable';
import { PageHeader } from '@/components/admin/ui';
import { adminListInquiries } from '@/lib/admin/queries';
import { pageSession } from '@/lib/auth/guard';

export const dynamic = 'force-dynamic';

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await pageSession('leads.read');
  if (!session) redirect('/admin');

  const { status } = await searchParams;
  const active = status ?? 'all';
  const leads = adminListInquiries(active);

  return (
    <>
      <PageHeader
        title="Inquiries"
        description="Contact form submissions. Contact details are visible only to authorised administrators and every read is logged."
      />
      <LeadsTable leads={leads} type="inquiries" activeStatus={active} />
    </>
  );
}
