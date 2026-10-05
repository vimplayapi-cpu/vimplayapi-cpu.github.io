import { locationSchema } from '@/lib/validation/schemas';
import type { ResourceConfig } from '@/lib/admin/resource';

export const locationsConfig: ResourceConfig<typeof locationSchema> = {
  table: 'locations',
  name: 'location',
  schema: locationSchema,
  uniqueColumn: 'slug',
  hasSortOrder: true,
  hasPublished: true,
  hasTimestamps: false,
  listSql: `SELECT id, slug, country, country_code, city, email, phone, address,
                   studio_availability, map_x, map_y, is_published, sort_order
            FROM locations ORDER BY sort_order, id`,
  toRow: (d) => ({
    slug: d.slug,
    country: d.country,
    country_code: d.country_code,
    city: d.city,
    address: d.address,
    email: d.email,
    phone: d.phone,
    studio_availability: d.studio_availability,
    services: JSON.stringify(d.services ?? []),
    map_x: d.map_x,
    map_y: d.map_y,
    is_published: d.is_published ? 1 : 0,
    updated_at: Math.floor(Date.now() / 1000),
  }),
};
