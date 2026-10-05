import { SeoEditor, type SeoRow } from '@/components/admin/SeoEditor';
import { PageHeader } from '@/components/admin/ui';
import { getDb } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

export default function SeoAdmin() {
  const rows = getDb()
    .prepare(`
      SELECT id, route, title, description, canonical, robots, og_image_id
      FROM seo_metadata ORDER BY route
    `)
    .all() as SeoRow[];

  return (
    <>
      <PageHeader
        title="SEO"
        description="Per-route titles, descriptions and robots directives. Anything left blank falls back to the site defaults in Settings; studio and service pages generate their own metadata from their records."
      />
      <SeoEditor rows={rows} />
    </>
  );
}
