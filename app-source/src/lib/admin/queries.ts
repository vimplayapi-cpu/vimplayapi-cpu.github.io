import { getDb, parseJson } from '@/lib/db/client';

/**
 * Admin-side reads.
 *
 * Separate from the public queries because these deliberately see everything —
 * unpublished rows, spam-flagged leads, inactive users. Nothing here is
 * reachable without passing the admin guard first.
 */

export interface AdminStudioRow {
  id: number;
  slug: string;
  code: string;
  name: string;
  status: string;
  locationId: number | null;
  locationCountry: string | null;
  isPublished: boolean;
  sortOrder: number;
  imageCount: number;
  hasVideo: boolean;
  accent: string;
  updatedAt: number;
}

export function adminListStudios(): AdminStudioRow[] {
  const rows = getDb()
    .prepare(`
      SELECT s.id, s.slug, s.code, s.name, s.status, s.location_id, s.is_published,
             s.sort_order, s.accent, s.updated_at, l.country,
             (SELECT COUNT(*) FROM studio_images si WHERE si.studio_id = s.id AND si.media_id IS NOT NULL) AS image_count,
             (SELECT COUNT(*) FROM studio_videos sv WHERE sv.studio_id = s.id AND sv.media_id IS NOT NULL) AS video_count
      FROM studios s
      LEFT JOIN locations l ON l.id = s.location_id
      ORDER BY s.sort_order, s.id
    `)
    .all() as Record<string, unknown>[];

  return rows.map((r) => ({
    id: Number(r.id),
    slug: String(r.slug),
    code: String(r.code),
    name: String(r.name),
    status: String(r.status),
    locationId: (r.location_id as number) ?? null,
    locationCountry: (r.country as string) ?? null,
    isPublished: Number(r.is_published) === 1,
    sortOrder: Number(r.sort_order),
    imageCount: Number(r.image_count),
    hasVideo: Number(r.video_count) > 0,
    accent: String(r.accent),
    updatedAt: Number(r.updated_at),
  }));
}

export function adminGetStudio(id: number) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM studios WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!row) return null;

  const images = db
    .prepare(`
      SELECT si.id, si.role, si.position, si.alt, si.caption, si.media_id,
             m.variants, m.lqip, m.width, m.height
      FROM studio_images si
      LEFT JOIN media m ON m.id = si.media_id
      WHERE si.studio_id = ? ORDER BY si.position
    `)
    .all(id) as Record<string, unknown>[];

  const video = db
    .prepare('SELECT id, media_id, poster_media_id, title, caption FROM studio_videos WHERE studio_id = ?')
    .get(id) as Record<string, unknown> | undefined;

  return {
    id: Number(row.id),
    slug: String(row.slug),
    code: String(row.code),
    name: String(row.name),
    tagline: String(row.tagline ?? ''),
    description: String(row.description ?? ''),
    environment: String(row.environment ?? ''),
    capacity: String(row.capacity ?? ''),
    characteristics: parseJson<string[]>(String(row.production_characteristics ?? '[]'), []),
    capabilities: parseJson<{ label: string; value: string }[]>(
      String(row.technical_capabilities ?? '[]'),
      [],
    ),
    locationId: (row.location_id as number) ?? null,
    status: String(row.status),
    availabilityNote: String(row.availability_note ?? ''),
    accent: String(row.accent),
    ctaLabel: String(row.cta_label ?? ''),
    seoTitle: String(row.seo_title ?? ''),
    seoDescription: String(row.seo_description ?? ''),
    isPublished: Number(row.is_published) === 1,
    sortOrder: Number(row.sort_order),
    images: images.map((i) => ({
      id: Number(i.id),
      role: String(i.role),
      position: Number(i.position),
      alt: String(i.alt ?? ''),
      caption: String(i.caption ?? ''),
      mediaId: (i.media_id as number) ?? null,
      thumb: parseJson<{ webp?: string }>(String(i.variants ?? '{}'), {}).webp ?? null,
    })),
    video: video
      ? {
          id: Number(video.id),
          mediaId: (video.media_id as number) ?? null,
          posterMediaId: (video.poster_media_id as number) ?? null,
          title: String(video.title ?? ''),
          caption: String(video.caption ?? ''),
        }
      : null,
  };
}

export interface AdminLead {
  id: number;
  name: string;
  email: string;
  company: string;
  phone: string;
  country: string;
  status: string;
  createdAt: number;
  summary: string;
  detail: Record<string, string>;
  internalNotes: string;
}

export function adminListInquiries(status?: string, limit = 100, offset = 0): AdminLead[] {
  const where = status && status !== 'all' ? 'WHERE status = ?' : '';
  const params = status && status !== 'all' ? [status, limit, offset] : [limit, offset];
  const rows = getDb()
    .prepare(`SELECT * FROM inquiries ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .all(...params) as Record<string, unknown>[];

  return rows.map((r) => ({
    id: Number(r.id),
    name: String(r.full_name),
    email: String(r.email),
    company: String(r.company ?? ''),
    phone: String(r.phone ?? ''),
    country: String(r.country ?? ''),
    status: String(r.status),
    createdAt: Number(r.created_at),
    summary: String(r.message ?? '').slice(0, 160),
    internalNotes: String(r.internal_notes ?? ''),
    detail: {
      'Service interest': String(r.service_interest ?? ''),
      'Project type': String(r.project_type ?? ''),
      Message: String(r.message ?? ''),
    },
  }));
}

export function adminListDemoRequests(status?: string, limit = 100, offset = 0): AdminLead[] {
  const where = status && status !== 'all' ? 'WHERE status = ?' : '';
  const params = status && status !== 'all' ? [status, limit, offset] : [limit, offset];
  const rows = getDb()
    .prepare(`SELECT * FROM demo_requests ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .all(...params) as Record<string, unknown>[];

  return rows.map((r) => ({
    id: Number(r.id),
    name: String(r.name),
    email: String(r.business_email),
    company: String(r.company ?? ''),
    phone: String(r.phone ?? ''),
    country: String(r.country ?? ''),
    status: String(r.status),
    createdAt: Number(r.created_at),
    summary: String(r.message ?? '').slice(0, 160),
    internalNotes: String(r.internal_notes ?? ''),
    detail: {
      'Requested studio': String(r.studio_label ?? '—'),
      'Operators': String(r.operators ?? ''),
      'Project type': String(r.project_type ?? ''),
      'Launch period': String(r.launch_period ?? ''),
      'Required services': parseJson<string[]>(String(r.required_services ?? '[]'), []).join(', '),
      Message: String(r.message ?? ''),
    },
  }));
}

export function adminCountLeads(): {
  inquiriesNew: number;
  demoNew: number;
  inquiriesTotal: number;
  demoTotal: number;
} {
  const db = getDb();
  const one = (sql: string) => (db.prepare(sql).get() as { c: number }).c;
  return {
    inquiriesNew: one("SELECT COUNT(*) c FROM inquiries WHERE status = 'new'"),
    demoNew: one("SELECT COUNT(*) c FROM demo_requests WHERE status = 'new'"),
    inquiriesTotal: one('SELECT COUNT(*) c FROM inquiries'),
    demoTotal: one('SELECT COUNT(*) c FROM demo_requests'),
  };
}

// ---------------------------------------------------------------------------
// Media library
// ---------------------------------------------------------------------------

export interface AdminMedia {
  id: number;
  kind: string;
  storageKey: string;
  originalName: string;
  mime: string;
  bytes: number;
  width: number | null;
  height: number | null;
  alt: string;
  caption: string;
  thumb: string | null;
  isManaged: boolean;
  createdAt: number;
}

export function adminListMedia(opts: { kind?: string; q?: string; limit?: number; offset?: number } = {}): {
  items: AdminMedia[];
  total: number;
} {
  const db = getDb();
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (opts.kind && opts.kind !== 'all') {
    clauses.push('kind = ?');
    params.push(opts.kind);
  }
  if (opts.q) {
    clauses.push('(original_name LIKE ? OR alt LIKE ? OR caption LIKE ?)');
    const like = `%${opts.q}%`;
    params.push(like, like, like);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const total = (db.prepare(`SELECT COUNT(*) c FROM media ${where}`).get(...params) as { c: number }).c;
  const rows = db
    .prepare(`SELECT * FROM media ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`)
    .all(...params, opts.limit ?? 60, opts.offset ?? 0) as Record<string, unknown>[];

  return {
    total,
    items: rows.map((r) => {
      const v = parseJson<{ webp?: string; src?: string }>(String(r.variants ?? '{}'), {});
      return {
        id: Number(r.id),
        kind: String(r.kind),
        storageKey: String(r.storage_key),
        originalName: String(r.original_name),
        mime: String(r.mime),
        bytes: Number(r.bytes),
        width: (r.width as number) ?? null,
        height: (r.height as number) ?? null,
        alt: String(r.alt ?? ''),
        caption: String(r.caption ?? ''),
        thumb: v.webp ?? v.src ?? null,
        isManaged: Number(r.is_managed) === 1,
        createdAt: Number(r.created_at),
      };
    }),
  };
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export interface AnalyticsSummary {
  visitors: number;
  pageviews: number;
  studioViews: number;
  galleryViews: number;
  inquiries: number;
  demoRequests: number;
  conversionRate: number;
  topPages: { path: string; views: number }[];
  topStudios: { name: string; views: number }[];
  sources: { host: string; views: number }[];
  countries: { code: string; views: number }[];
  devices: { device: string; views: number }[];
  daily: { day: string; views: number; visitors: number }[];
}

/** Aggregates the analytics table over a rolling window. */
export function adminAnalytics(days = 30): AnalyticsSummary {
  const db = getDb();
  const since = Math.floor(Date.now() / 1000) - days * 86400;

  const scalar = (sql: string, ...params: unknown[]) =>
    Number((db.prepare(sql).get(...params) as { c: number } | undefined)?.c ?? 0);

  const visitors = scalar(
    "SELECT COUNT(DISTINCT visitor_hash) c FROM analytics_events WHERE created_at >= ? AND visitor_hash != ''",
    since,
  );
  const pageviews = scalar(
    "SELECT COUNT(*) c FROM analytics_events WHERE created_at >= ? AND type = 'pageview'",
    since,
  );
  const studioViews = scalar(
    "SELECT COUNT(*) c FROM analytics_events WHERE created_at >= ? AND type = 'studio_view'",
    since,
  );
  const galleryViews = scalar(
    "SELECT COUNT(*) c FROM analytics_events WHERE created_at >= ? AND type = 'gallery_view'",
    since,
  );
  const inquiries = scalar(
    "SELECT COUNT(*) c FROM analytics_events WHERE created_at >= ? AND type = 'inquiry'",
    since,
  );
  const demoRequests = scalar(
    "SELECT COUNT(*) c FROM analytics_events WHERE created_at >= ? AND type = 'demo_request'",
    since,
  );

  const rows = <T>(sql: string, ...params: unknown[]): T[] => db.prepare(sql).all(...params) as T[];

  const topPages = rows<{ path: string; views: number }>(
    `SELECT path, COUNT(*) AS views FROM analytics_events
     WHERE created_at >= ? AND type = 'pageview'
     GROUP BY path ORDER BY views DESC LIMIT 10`,
    since,
  );

  const topStudios = rows<{ name: string; views: number }>(
    `SELECT COALESCE(s.name, 'Unknown') AS name, COUNT(*) AS views
     FROM analytics_events a LEFT JOIN studios s ON s.id = a.entity_id
     WHERE a.created_at >= ? AND a.type = 'studio_view'
     GROUP BY a.entity_id ORDER BY views DESC LIMIT 10`,
    since,
  );

  const sources = rows<{ host: string; views: number }>(
    `SELECT CASE WHEN referrer_host = '' THEN 'Direct' ELSE referrer_host END AS host,
            COUNT(*) AS views
     FROM analytics_events WHERE created_at >= ? AND type = 'pageview'
     GROUP BY host ORDER BY views DESC LIMIT 10`,
    since,
  );

  const countries = rows<{ code: string; views: number }>(
    `SELECT CASE WHEN country = '' THEN 'Unknown' ELSE country END AS code, COUNT(*) AS views
     FROM analytics_events WHERE created_at >= ? AND type = 'pageview'
     GROUP BY code ORDER BY views DESC LIMIT 10`,
    since,
  );

  const devices = rows<{ device: string; views: number }>(
    `SELECT CASE WHEN device = '' THEN 'unknown' ELSE device END AS device, COUNT(*) AS views
     FROM analytics_events WHERE created_at >= ? AND type = 'pageview'
     GROUP BY device ORDER BY views DESC`,
    since,
  );

  const daily = rows<{ day: string; views: number; visitors: number }>(
    `SELECT day, COUNT(*) AS views, COUNT(DISTINCT visitor_hash) AS visitors
     FROM analytics_events WHERE created_at >= ? AND type = 'pageview'
     GROUP BY day ORDER BY day`,
    since,
  );

  const conversions = inquiries + demoRequests;
  return {
    visitors,
    pageviews,
    studioViews,
    galleryViews,
    inquiries,
    demoRequests,
    // Conversions as a share of unique visitors, not of raw pageviews.
    conversionRate: visitors > 0 ? Number(((conversions / visitors) * 100).toFixed(2)) : 0,
    topPages,
    topStudios,
    sources,
    countries,
    devices,
    daily,
  };
}

export function adminListUsers() {
  return getDb()
    .prepare(`
      SELECT u.id, u.email, u.name, u.is_active, u.last_login_at, u.created_at,
             u.locked_until, r.slug AS role_slug, r.name AS role_name, r.id AS role_id
      FROM users u JOIN roles r ON r.id = u.role_id
      ORDER BY u.created_at
    `)
    .all() as {
      id: number; email: string; name: string; is_active: number;
      last_login_at: number | null; created_at: number; locked_until: number | null;
      role_slug: string; role_name: string; role_id: number;
    }[];
}

export function adminListRoles() {
  return getDb()
    .prepare('SELECT id, slug, name, description, permissions FROM roles ORDER BY sort_order')
    .all() as { id: number; slug: string; name: string; description: string; permissions: string }[];
}
