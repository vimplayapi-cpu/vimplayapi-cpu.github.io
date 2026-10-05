import { CollectionEditor, type FieldDef } from '@/components/admin/CollectionEditor';
import { PageHeader } from '@/components/admin/ui';
import { getDb, parseJson } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

const FIELDS: FieldDef[] = [
  { key: 'code', label: 'Code', type: 'text', hint: 'e.g. SERVICE 01' },
  { key: 'title', label: 'Title', type: 'text', required: true },
  { key: 'slug', label: 'Slug', type: 'text', required: true, hint: 'Used in the URL.' },
  { key: 'icon', label: 'Icon key', type: 'select', options: [
    'studio', 'design', 'shared', 'stream', 'staff', 'training', 'support',
  ].map((v) => ({ value: v, label: v })) },
  { key: 'summary', label: 'Summary', type: 'textarea', rows: 3 },
  { key: 'body', label: 'Body', type: 'textarea', rows: 8, hint: 'Blank lines separate paragraphs.' },
  { key: 'inclusions', label: 'Included items', type: 'pairs' },
  { key: 'cta_label', label: 'CTA label', type: 'text' },
  { key: 'seo_title', label: 'SEO title', type: 'text' },
  { key: 'seo_description', label: 'SEO description', type: 'textarea', rows: 2 },
  { key: 'is_published', label: 'Published', type: 'checkbox' },
];

export default function ServicesAdmin() {
  const rows = getDb()
    .prepare('SELECT * FROM services ORDER BY sort_order, id')
    .all() as Record<string, unknown>[];

  // JSON columns are parsed here so the editor receives real arrays.
  const parsed = rows.map((r) => ({
    ...r,
    inclusions: parseJson(String(r.inclusions ?? '[]'), []),
  }));

  return (
    <>
      <PageHeader
        title="Services"
        description="The six service offerings. Each has its own detail page at /services/<slug>."
      />
      <CollectionEditor
        endpoint="/api/admin/services"
        rows={parsed}
        fields={FIELDS}
        titleKey="title"
        subtitleKey="code"
        emptyLabel="No services yet."
      />
    </>
  );
}
