import { CollectionEditor, type FieldDef } from '@/components/admin/CollectionEditor';
import { PageHeader } from '@/components/admin/ui';
import { getDb } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

const FIELDS: FieldDef[] = [
  { key: 'year', label: 'Year', type: 'text' },
  { key: 'event', label: 'Milestone', type: 'text' },
  { key: 'description', label: 'Description', type: 'textarea', rows: 4 },
  { key: 'media_id', label: 'Image', type: 'media', mediaKind: 'image' },
  { key: 'is_published', label: 'Published', type: 'checkbox' },
];

export default function TimelineAdmin() {
  const rows = getDb()
    .prepare('SELECT * FROM timeline_events ORDER BY sort_order, id')
    .all() as Record<string, unknown>[];

  return (
    <>
      <PageHeader
        title="Company timeline"
        description="Milestones shown on the About page. Entries seeded as bracketed placeholders are rendered as pending until you replace them with real history — nothing is invented."
      />
      <CollectionEditor
        endpoint="/api/admin/timeline"
        rows={rows}
        fields={FIELDS}
        titleKey="event"
        subtitleKey="year"
        emptyLabel="No timeline entries yet."
      />
    </>
  );
}
