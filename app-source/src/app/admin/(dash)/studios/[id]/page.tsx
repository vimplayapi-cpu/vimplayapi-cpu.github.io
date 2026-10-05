import Link from 'next/link';
import { notFound } from 'next/navigation';

import { StudioEditor, type StudioFormValues } from '@/components/admin/StudioEditor';
import { PageHeader } from '@/components/admin/ui';
import { adminGetStudio } from '@/lib/admin/queries';
import { getDb } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

export default async function EditStudioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) notFound();

  const studio = adminGetStudio(numericId);
  if (!studio) notFound();

  const locations = getDb()
    .prepare('SELECT id, country FROM locations ORDER BY sort_order')
    .all() as { id: number; country: string }[];

  const initial: StudioFormValues = {
    id: studio.id,
    slug: studio.slug,
    code: studio.code,
    name: studio.name,
    tagline: studio.tagline,
    description: studio.description,
    environment: studio.environment,
    capacity: studio.capacity,
    characteristics: studio.characteristics,
    capabilities: studio.capabilities,
    locationId: studio.locationId,
    status: studio.status,
    availabilityNote: studio.availabilityNote,
    accent: studio.accent,
    ctaLabel: studio.ctaLabel,
    seoTitle: studio.seoTitle,
    seoDescription: studio.seoDescription,
    isPublished: studio.isPublished,
    images: studio.images,
    video: studio.video
      ? {
          mediaId: studio.video.mediaId,
          posterMediaId: studio.video.posterMediaId,
          title: studio.video.title,
          caption: studio.video.caption,
        }
      : null,
  };

  return (
    <>
      <PageHeader
        title={studio.name}
        description={`${studio.code} · /studios/${studio.slug}`}
        actions={
          <>
            <Link href="/admin/studios" className="btn btn-secondary py-3">
              BACK TO LIST
            </Link>
            <Link
              href={`/studios/${studio.slug}`}
              target="_blank"
              rel="noopener"
              className="btn btn-secondary py-3"
            >
              VIEW LIVE
            </Link>
          </>
        }
      />
      <StudioEditor initial={initial} locations={locations} />
    </>
  );
}
