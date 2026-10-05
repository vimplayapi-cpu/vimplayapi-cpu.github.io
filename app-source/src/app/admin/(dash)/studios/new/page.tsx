import { StudioEditor, type StudioFormValues } from '@/components/admin/StudioEditor';
import { PageHeader } from '@/components/admin/ui';
import { getDb } from '@/lib/db/client';
import { TECHNICAL_SPEC_ROWS, PLACEHOLDER } from '@/lib/db/seed-data';

export const dynamic = 'force-dynamic';

export default function NewStudioPage() {
  const locations = getDb()
    .prepare('SELECT id, country FROM locations ORDER BY sort_order')
    .all() as { id: number; country: string }[];

  const count = (getDb().prepare('SELECT COUNT(*) c FROM studios').get() as { c: number }).c;

  // New studios start with the standard specification rows already laid out,
  // each holding a placeholder rather than an invented value.
  const initial: StudioFormValues = {
    id: null,
    slug: '',
    code: `STUDIO ${String(count + 1).padStart(2, '0')}`,
    name: '',
    tagline: '',
    description: '',
    environment: '',
    capacity: PLACEHOLDER.capacity,
    characteristics: [],
    capabilities: TECHNICAL_SPEC_ROWS.map((label) => ({ label, value: PLACEHOLDER.value })),
    locationId: null,
    status: 'available',
    availabilityNote: PLACEHOLDER.availability,
    accent: '#3DDCE8',
    ctaLabel: 'REQUEST INFORMATION',
    seoTitle: '',
    seoDescription: '',
    isPublished: false,
    images: [],
    video: null,
  };

  return (
    <>
      <PageHeader
        title="New studio"
        description="Create the record first, then attach its four reference images and video."
      />
      <StudioEditor initial={initial} locations={locations} />
    </>
  );
}
