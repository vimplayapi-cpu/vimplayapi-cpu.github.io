import { CollectionEditor, type FieldDef } from '@/components/admin/CollectionEditor';
import { PageHeader } from '@/components/admin/ui';
import { getDb } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

export default function GalleryAdmin() {
  const db = getDb();
  const rows = db
    .prepare(`
      SELECT g.*, c.name AS category_name
      FROM gallery g LEFT JOIN gallery_categories c ON c.id = g.category_id
      ORDER BY g.sort_order, g.id
    `)
    .all() as Record<string, unknown>[];

  const categories = db
    .prepare('SELECT id, name FROM gallery_categories ORDER BY sort_order')
    .all() as { id: number; name: string }[];
  const studios = db
    .prepare('SELECT id, name FROM studios ORDER BY sort_order')
    .all() as { id: number; name: string }[];

  const fields: FieldDef[] = [
    { key: 'media_id', label: 'Image', type: 'media', mediaKind: 'image', required: true },
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'caption', label: 'Caption', type: 'text' },
    { key: 'alt', label: 'Alt text', type: 'textarea', rows: 2, hint: 'Describes the image for screen readers.' },
    {
      key: 'category_id', label: 'Category', type: 'select',
      options: categories.map((c) => ({ value: String(c.id), label: c.name })),
    },
    {
      key: 'studio_id', label: 'Studio', type: 'select',
      options: studios.map((s) => ({ value: String(s.id), label: s.name })),
    },
    { key: 'is_published', label: 'Published', type: 'checkbox' },
  ];

  return (
    <>
      <PageHeader
        title="Gallery"
        description="Images shown on the public gallery, grouped by category."
      />
      <CollectionEditor
        endpoint="/api/admin/gallery"
        rows={rows}
        fields={fields}
        titleKey="title"
        subtitleKey="category_name"
        emptyLabel="No gallery items yet."
      />
    </>
  );
}
