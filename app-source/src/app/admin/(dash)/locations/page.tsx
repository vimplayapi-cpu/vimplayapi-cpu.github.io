import { CollectionEditor, type FieldDef } from '@/components/admin/CollectionEditor';
import { PageHeader } from '@/components/admin/ui';
import { getDb, parseJson } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

const FIELDS: FieldDef[] = [
  { key: 'country', label: 'Country', type: 'text', required: true },
  { key: 'slug', label: 'Slug', type: 'text', required: true },
  { key: 'country_code', label: 'Country code', type: 'text', hint: 'Two letters, e.g. GE.' },
  { key: 'city', label: 'City', type: 'text' },
  {
    key: 'address', label: 'Address', type: 'textarea', rows: 3,
    hint: 'Left blank means no address is published for this market. Only add a real, approved address.',
  },
  { key: 'email', label: 'Email', type: 'text' },
  { key: 'phone', label: 'Phone', type: 'text' },
  { key: 'studio_availability', label: 'Studio availability', type: 'text' },
  { key: 'services', label: 'Services offered', type: 'list' },
  { key: 'map_x', label: 'Map X (0–100)', type: 'number', hint: 'Horizontal position on the schematic map.' },
  { key: 'map_y', label: 'Map Y (0–100)', type: 'number', hint: 'Vertical position on the schematic map.' },
  { key: 'is_published', label: 'Published', type: 'checkbox' },
];

export default function LocationsAdmin() {
  const rows = getDb()
    .prepare('SELECT * FROM locations ORDER BY sort_order, id')
    .all() as Record<string, unknown>[];

  const parsed = rows.map((r) => ({ ...r, services: parseJson(String(r.services ?? '[]'), []) }));

  return (
    <>
      <PageHeader
        title="Locations"
        description="Markets shown on the About page map and in the footer. Addresses are published only when supplied here."
      />
      <CollectionEditor
        endpoint="/api/admin/locations"
        rows={parsed}
        fields={FIELDS}
        titleKey="country"
        subtitleKey="city"
        emptyLabel="No locations yet."
      />
    </>
  );
}
