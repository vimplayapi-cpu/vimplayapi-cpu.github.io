import { timelineSchema } from '@/lib/validation/schemas';
import type { ResourceConfig } from '@/lib/admin/resource';

export const timelineConfig: ResourceConfig<typeof timelineSchema> = {
  table: 'timeline_events',
  name: 'timeline',
  schema: timelineSchema,
  hasSortOrder: true,
  hasPublished: true,
  hasTimestamps: false,
  listSql: `SELECT id, year, event, description, media_id, is_published, sort_order
            FROM timeline_events ORDER BY sort_order, id`,
  toRow: (d) => ({
    year: d.year,
    event: d.event,
    description: d.description,
    media_id: d.media_id ?? null,
    is_published: d.is_published ? 1 : 0,
    updated_at: Math.floor(Date.now() / 1000),
  }),
};
