import Link from 'next/link';

import { StudioAdminList } from '@/components/admin/StudioAdminList';
import { PageHeader } from '@/components/admin/ui';
import { adminListStudios } from '@/lib/admin/queries';
import { getDb } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

export default function AdminStudiosPage() {
  const studios = adminListStudios();
  const locations = getDb()
    .prepare('SELECT id, country FROM locations ORDER BY sort_order')
    .all() as { id: number; country: string }[];

  return (
    <>
      <PageHeader
        title="Studios"
        description="Create, edit, publish, reorder and delete studio environments. Each studio supports four reference images and one video."
        actions={
          <Link href="/admin/studios/new" className="btn btn-primary py-3">
            NEW STUDIO
          </Link>
        }
      />
      <StudioAdminList studios={studios} locations={locations} />
    </>
  );
}
