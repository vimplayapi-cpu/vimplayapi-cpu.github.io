import { serviceSchema } from '@/lib/validation/schemas';
import type { ResourceConfig } from '@/lib/admin/resource';

/** Shared config for the services collection and item routes. */
export const servicesConfig: ResourceConfig<typeof serviceSchema> = {
  table: 'services',
  name: 'service',
  schema: serviceSchema,
  uniqueColumn: 'slug',
  hasSortOrder: true,
  hasPublished: true,
  hasTimestamps: true,
  listSql: `SELECT id, slug, code, title, summary, icon, is_published, sort_order, updated_at
            FROM services ORDER BY sort_order, id`,
  toRow: (d) => ({
    slug: d.slug,
    code: d.code,
    title: d.title,
    summary: d.summary,
    body: d.body,
    inclusions: JSON.stringify(d.inclusions ?? []),
    icon: d.icon,
    cta_label: d.cta_label,
    seo_title: d.seo_title,
    seo_description: d.seo_description,
    is_published: d.is_published ? 1 : 0,
  }),
};
