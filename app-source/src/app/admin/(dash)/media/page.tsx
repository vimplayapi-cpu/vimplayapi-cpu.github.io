import { redirect } from 'next/navigation';

import { MediaLibrary } from '@/components/admin/MediaLibrary';
import { PageHeader } from '@/components/admin/ui';
import { pageSession } from '@/lib/auth/guard';

export const dynamic = 'force-dynamic';

export default async function MediaPage() {
  const session = await pageSession('media.read');
  if (!session) redirect('/admin');

  return (
    <>
      <PageHeader
        title="Media library"
        description="Upload, search, preview, replace and delete assets. Images are converted to AVIF and WebP at three responsive widths on upload."
      />
      <MediaLibrary />
    </>
  );
}
