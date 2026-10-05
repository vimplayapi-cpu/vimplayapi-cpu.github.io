import { galleryItemSchema } from '@/lib/validation/schemas';
import type { ResourceConfig } from '@/lib/admin/resource';

export const galleryConfig: ResourceConfig<typeof galleryItemSchema> = {
  table: 'gallery',
  name: 'gallery',
  schema: galleryItemSchema,
  hasSortOrder: true,
  hasPublished: true,
  hasTimestamps: false,
  listSql: `SELECT g.id, g.title, g.caption, g.alt, g.is_published, g.sort_order,
                   g.media_id, g.category_id, g.studio_id,
                   c.name AS category_name, m.variants
            FROM gallery g
            LEFT JOIN gallery_categories c ON c.id = g.category_id
            LEFT JOIN media m ON m.id = g.media_id
            ORDER BY g.sort_order, g.id`,
  toRow: (d) => ({
    media_id: d.media_id,
    category_id: d.category_id ?? null,
    studio_id: d.studio_id ?? null,
    title: d.title,
    caption: d.caption,
    alt: d.alt,
    is_published: d.is_published ? 1 : 0,
    created_at: Math.floor(Date.now() / 1000),
  }),
};
