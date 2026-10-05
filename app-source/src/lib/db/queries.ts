import { cache } from 'react';

import { getDb, parseJson } from './client';
import type {
  GalleryCategory, GalleryItem, ImageAsset, Location, LocationSummary,
  Service, SeoRecord, SocialPost, Studio, StudioImage, TimelineEvent,
  StudioStatus, TechSpec, VideoAsset,
} from './types';
import { STUDIO_STATUS_LABEL } from './types';

/**
 * Read-side data access for the public site.
 *
 * Every function here is wrapped in React's `cache` so a single render pass
 * hits SQLite once per distinct query, even when several components ask for
 * the same data. All of these read published rows only — the admin surface
 * uses its own queries that can see drafts.
 */

// ---------------------------------------------------------------------------
// Row → domain mapping
// ---------------------------------------------------------------------------

interface MediaRow {
  id: number;
  variants: string;
  width: number | null;
  height: number | null;
  lqip: string;
  dominant: string;
  alt: string;
  caption: string;
  storage_key: string;
  mime: string;
  duration_s: number | null;
  kind: string;
}

interface Variants {
  avif?: string;
  webp?: string;
  avifSrcSet?: string;
  webpSrcSet?: string;
  src?: string;
  role?: string;
  roleLabel?: string;
}

/**
 * Normalises a media row into an ImageAsset. Uploaded assets store their
 * derivative URLs in `variants`; if a variant set is missing we fall back to
 * the raw upload path so a freshly uploaded image still renders.
 */
function toImage(row: MediaRow | undefined, altOverride?: string, captionOverride?: string): ImageAsset | null {
  if (!row) return null;
  const v = parseJson<Variants>(row.variants, {});
  const fallback = v.src ?? `/uploads/${row.storage_key}`;
  return {
    id: row.id,
    avif: v.avif ?? fallback,
    webp: v.webp ?? fallback,
    avifSrcSet: v.avifSrcSet ?? '',
    webpSrcSet: v.webpSrcSet ?? '',
    width: row.width ?? 1600,
    height: row.height ?? 1067,
    lqip: row.lqip ?? '',
    dominant: row.dominant || '#11151C',
    alt: altOverride?.trim() || row.alt || '',
    caption: captionOverride?.trim() || row.caption || '',
  };
}

const MEDIA_COLS = `
  m.id, m.variants, m.width, m.height, m.lqip, m.dominant,
  m.alt, m.caption, m.storage_key, m.mime, m.duration_s, m.kind
`;

// ---------------------------------------------------------------------------
// Content blocks & settings
// ---------------------------------------------------------------------------

/** All blocks for a page, as a key → value map. */
export const getBlocks = cache((page: string): Record<string, string> => {
  const rows = getDb()
    .prepare('SELECT block_key, value FROM content_blocks WHERE page = ?')
    .all(page) as { block_key: string; value: string }[];
  return Object.fromEntries(rows.map((r) => [r.block_key, r.value]));
});

/**
 * Reads a single block with a fallback. Components pass a sensible default so
 * an empty CMS never renders a blank region.
 */
export function block(blocks: Record<string, string>, key: string, fallback = ''): string {
  const v = blocks[key];
  return v === undefined || v === '' ? fallback : v;
}

/** Parses a JSON-typed block. */
export function blockJson<T>(blocks: Record<string, string>, key: string, fallback: T): T {
  return parseJson<T>(blocks[key], fallback);
}

export const getSettings = cache((): Record<string, string> => {
  const rows = getDb().prepare('SELECT key, value FROM site_settings').all() as {
    key: string;
    value: string;
  }[];
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
});

export function setting(settings: Record<string, string>, key: string, fallback = ''): string {
  const v = settings[key];
  return v === undefined || v === '' ? fallback : v;
}

export function settingBool(settings: Record<string, string>, key: string): boolean {
  return settings[key] === 'true' || settings[key] === '1';
}

export function settingNumber(settings: Record<string, string>, key: string, fallback: number): number {
  const n = Number(settings[key]);
  return Number.isFinite(n) ? n : fallback;
}

// ---------------------------------------------------------------------------
// Studios
// ---------------------------------------------------------------------------

interface StudioRow {
  id: number;
  slug: string;
  code: string;
  name: string;
  tagline: string;
  description: string;
  environment: string;
  capacity: string;
  production_characteristics: string;
  technical_capabilities: string;
  status: StudioStatus;
  availability_note: string;
  accent: string;
  cta_label: string;
  seo_title: string;
  seo_description: string;
  is_published: number;
  sort_order: number;
  loc_id: number | null;
  loc_slug: string | null;
  loc_country: string | null;
  loc_code: string | null;
  loc_city: string | null;
}

const STUDIO_SELECT = `
  SELECT s.id, s.slug, s.code, s.name, s.tagline, s.description, s.environment, s.capacity,
         s.production_characteristics, s.technical_capabilities, s.status, s.availability_note,
         s.accent, s.cta_label, s.seo_title, s.seo_description, s.is_published, s.sort_order,
         l.id AS loc_id, l.slug AS loc_slug, l.country AS loc_country,
         l.country_code AS loc_code, l.city AS loc_city
  FROM studios s
  LEFT JOIN locations l ON l.id = s.location_id
`;

function studioImages(studioId: number): StudioImage[] {
  const rows = getDb()
    .prepare(`
      SELECT si.role, si.position, si.alt AS si_alt, si.caption AS si_caption, ${MEDIA_COLS}
      FROM studio_images si
      LEFT JOIN media m ON m.id = si.media_id
      WHERE si.studio_id = ?
      ORDER BY si.position
    `)
    .all(studioId) as (MediaRow & {
      role: StudioImage['role'];
      position: number;
      si_alt: string;
      si_caption: string;
    })[];

  return rows
    .filter((r) => r.id != null)
    .map((r) => {
      const img = toImage(r, r.si_alt, r.si_caption)!;
      const v = parseJson<Variants>(r.variants, {});
      return { ...img, role: r.role, roleLabel: v.roleLabel ?? r.role, position: r.position };
    });
}

function studioVideo(studioId: number): VideoAsset | null {
  const row = getDb()
    .prepare(`
      SELECT sv.title, sv.caption,
             m.id AS vid_id, m.storage_key AS vid_key, m.mime AS vid_mime,
             m.variants AS vid_variants, m.duration_s AS vid_duration,
             p.id AS p_id, p.variants AS p_variants, p.width AS p_width, p.height AS p_height,
             p.lqip AS p_lqip, p.dominant AS p_dominant, p.alt AS p_alt, p.caption AS p_caption,
             p.storage_key AS p_key, p.mime AS p_mime, p.duration_s AS p_duration, p.kind AS p_kind
      FROM studio_videos sv
      LEFT JOIN media m ON m.id = sv.media_id
      LEFT JOIN media p ON p.id = sv.poster_media_id
      WHERE sv.studio_id = ?
    `)
    .get(studioId) as Record<string, unknown> | undefined;

  // No video uploaded yet — callers render an explicit empty state.
  if (!row || row.vid_id == null) return null;

  const variants = parseJson<Variants>(String(row.vid_variants ?? '{}'), {});
  const poster =
    row.p_id != null
      ? toImage({
          id: Number(row.p_id),
          variants: String(row.p_variants ?? '{}'),
          width: row.p_width as number | null,
          height: row.p_height as number | null,
          lqip: String(row.p_lqip ?? ''),
          dominant: String(row.p_dominant ?? ''),
          alt: String(row.p_alt ?? ''),
          caption: String(row.p_caption ?? ''),
          storage_key: String(row.p_key ?? ''),
          mime: String(row.p_mime ?? ''),
          duration_s: row.p_duration as number | null,
          kind: String(row.p_kind ?? 'image'),
        })
      : null;

  return {
    id: Number(row.vid_id),
    src: variants.src ?? `/uploads/${String(row.vid_key)}`,
    mime: String(row.vid_mime ?? 'video/mp4'),
    poster,
    title: String(row.title ?? ''),
    caption: String(row.caption ?? ''),
    durationSeconds: (row.vid_duration as number | null) ?? null,
  };
}

function mapStudio(r: StudioRow, withMedia: boolean): Studio {
  return {
    id: r.id,
    slug: r.slug,
    code: r.code,
    name: r.name,
    tagline: r.tagline,
    description: r.description,
    environment: r.environment,
    capacity: r.capacity,
    characteristics: parseJson<string[]>(r.production_characteristics, []),
    capabilities: parseJson<TechSpec[]>(r.technical_capabilities, []),
    status: r.status,
    statusLabel: STUDIO_STATUS_LABEL[r.status] ?? r.status,
    availabilityNote: r.availability_note,
    accent: r.accent,
    ctaLabel: r.cta_label,
    seoTitle: r.seo_title,
    seoDescription: r.seo_description,
    isPublished: r.is_published === 1,
    sortOrder: r.sort_order,
    location:
      r.loc_id != null
        ? {
            id: r.loc_id,
            slug: r.loc_slug ?? '',
            country: r.loc_country ?? '',
            countryCode: r.loc_code ?? '',
            city: r.loc_city ?? '',
          }
        : null,
    images: withMedia ? studioImages(r.id) : [],
    video: withMedia ? studioVideo(r.id) : null,
  };
}

export const getStudios = cache((): Studio[] => {
  const rows = getDb()
    .prepare(`${STUDIO_SELECT} WHERE s.is_published = 1 ORDER BY s.sort_order, s.id`)
    .all() as StudioRow[];
  return rows.map((r) => mapStudio(r, true));
});

export const getStudioBySlug = cache((slug: string): Studio | null => {
  const row = getDb()
    .prepare(`${STUDIO_SELECT} WHERE s.slug = ? AND s.is_published = 1`)
    .get(slug) as StudioRow | undefined;
  return row ? mapStudio(row, true) : null;
});

/** Slugs for generateStaticParams — published studios only. */
export const getStudioSlugs = cache((): string[] =>
  (getDb().prepare('SELECT slug FROM studios WHERE is_published = 1 ORDER BY sort_order').all() as {
    slug: string;
  }[]).map((r) => r.slug),
);

/** Lightweight list for form dropdowns. */
export const getStudioOptions = cache((): { slug: string; code: string; name: string }[] =>
  getDb()
    .prepare('SELECT slug, code, name FROM studios WHERE is_published = 1 ORDER BY sort_order')
    .all() as { slug: string; code: string; name: string }[],
);

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

export const getServices = cache((): Service[] => {
  const rows = getDb()
    .prepare(`
      SELECT s.*, ${MEDIA_COLS}
      FROM services s
      LEFT JOIN media m ON m.id = s.hero_media_id
      WHERE s.is_published = 1
      ORDER BY s.sort_order, s.id
    `)
    .all() as Record<string, unknown>[];

  return rows.map((r) => ({
    id: Number(r.id),
    slug: String(r.slug),
    code: String(r.code),
    title: String(r.title),
    summary: String(r.summary),
    body: String(r.body),
    inclusions: parseJson(String(r.inclusions ?? '[]'), []),
    icon: String(r.icon ?? ''),
    ctaLabel: String(r.cta_label ?? 'REQUEST A DEMO'),
    seoTitle: String(r.seo_title ?? ''),
    seoDescription: String(r.seo_description ?? ''),
    heroImage: r.id != null && r['storage_key'] ? toImage(r as unknown as MediaRow) : null,
    sortOrder: Number(r.sort_order ?? 0),
  }));
});

export const getServiceBySlug = cache((slug: string): Service | null =>
  getServices().find((s) => s.slug === slug) ?? null,
);

export const getServiceSlugs = cache((): string[] => getServices().map((s) => s.slug));

// ---------------------------------------------------------------------------
// Locations
// ---------------------------------------------------------------------------

export const getLocations = cache((): Location[] => {
  const rows = getDb()
    .prepare(`
      SELECT l.*, (
        SELECT COUNT(*) FROM studios s WHERE s.location_id = l.id AND s.is_published = 1
      ) AS studio_count
      FROM locations l
      WHERE l.is_published = 1
      ORDER BY l.sort_order, l.id
    `)
    .all() as Record<string, unknown>[];

  return rows.map((r) => ({
    id: Number(r.id),
    slug: String(r.slug),
    country: String(r.country),
    countryCode: String(r.country_code ?? ''),
    city: String(r.city ?? ''),
    address: String(r.address ?? ''),
    email: String(r.email ?? ''),
    phone: String(r.phone ?? ''),
    studioAvailability: String(r.studio_availability ?? ''),
    services: parseJson<string[]>(String(r.services ?? '[]'), []),
    mapX: Number(r.map_x ?? 50),
    mapY: Number(r.map_y ?? 50),
    studioCount: Number(r.studio_count ?? 0),
  }));
});

// ---------------------------------------------------------------------------
// Gallery
// ---------------------------------------------------------------------------

export const getGalleryCategories = cache((): GalleryCategory[] => {
  const rows = getDb()
    .prepare(`
      SELECT c.id, c.slug, c.name, (
        SELECT COUNT(*) FROM gallery g
        WHERE g.category_id = c.id AND g.is_published = 1 AND g.media_id IS NOT NULL
      ) AS count
      FROM gallery_categories c
      ORDER BY c.sort_order, c.id
    `)
    .all() as { id: number; slug: string; name: string; count: number }[];
  return rows;
});

export const getGalleryItems = cache((): GalleryItem[] => {
  const rows = getDb()
    .prepare(`
      SELECT g.id, g.title, g.caption AS g_caption, g.alt AS g_alt,
             c.slug AS cat_slug, c.name AS cat_name, s.slug AS studio_slug, ${MEDIA_COLS}
      FROM gallery g
      JOIN media m ON m.id = g.media_id
      LEFT JOIN gallery_categories c ON c.id = g.category_id
      LEFT JOIN studios s ON s.id = g.studio_id
      WHERE g.is_published = 1
      ORDER BY g.sort_order, g.id
    `)
    .all() as (MediaRow & {
      title: string;
      g_caption: string;
      g_alt: string;
      cat_slug: string | null;
      cat_name: string | null;
      studio_slug: string | null;
    })[];

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    caption: r.g_caption,
    categorySlug: r.cat_slug ?? 'uncategorised',
    categoryName: r.cat_name ?? 'Uncategorised',
    studioSlug: r.studio_slug,
    image: toImage(r, r.g_alt, r.g_caption)!,
  }));
});

// ---------------------------------------------------------------------------
// Timeline & social
// ---------------------------------------------------------------------------

export const getTimeline = cache((): TimelineEvent[] => {
  const rows = getDb()
    .prepare(`
      SELECT t.id, t.year, t.event, t.description, t.sort_order, ${MEDIA_COLS}
      FROM timeline_events t
      LEFT JOIN media m ON m.id = t.media_id
      WHERE t.is_published = 1
      ORDER BY t.sort_order, t.id
    `)
    .all() as (Partial<MediaRow> & {
      id: number;
      year: string;
      event: string;
      description: string;
      sort_order: number;
    })[];

  return rows.map((r) => ({
    id: r.id,
    year: r.year,
    event: r.event,
    description: r.description,
    image: r.storage_key ? toImage(r as MediaRow) : null,
    sortOrder: r.sort_order,
  }));
});

export const getSocialPosts = cache((): SocialPost[] => {
  const rows = getDb()
    .prepare(`
      SELECT sp.id, sp.platform, sp.url, sp.caption AS sp_caption, ${MEDIA_COLS}
      FROM social_posts sp
      LEFT JOIN media m ON m.id = sp.media_id
      WHERE sp.is_published = 1
      ORDER BY sp.sort_order, sp.id
    `)
    .all() as (Partial<MediaRow> & {
      id: number;
      platform: string;
      url: string;
      sp_caption: string;
    })[];

  return rows.map((r) => ({
    id: r.id,
    platform: r.platform,
    url: r.url,
    caption: r.sp_caption,
    image: r.storage_key ? toImage(r as MediaRow, '', r.sp_caption) : null,
  }));
});

// ---------------------------------------------------------------------------
// SEO
// ---------------------------------------------------------------------------

export const getSeo = cache((route: string): SeoRecord | null => {
  const row = getDb()
    .prepare(`
      SELECT s.route, s.title, s.description, s.canonical, s.robots, m.variants AS og_variants
      FROM seo_metadata s
      LEFT JOIN media m ON m.id = s.og_image_id
      WHERE s.route = ?
    `)
    .get(route) as Record<string, unknown> | undefined;
  if (!row) return null;

  const og = parseJson<Variants>(String(row.og_variants ?? '{}'), {});
  return {
    route: String(row.route),
    title: String(row.title ?? ''),
    description: String(row.description ?? ''),
    canonical: String(row.canonical ?? ''),
    robots: String(row.robots ?? 'index,follow'),
    ogImage: og.webp ?? og.src ?? null,
  };
});

/** Published page slugs, used to build the sitemap. */
export const getPublishedPages = cache((): { slug: string; title: string }[] =>
  getDb()
    .prepare('SELECT slug, title FROM pages WHERE is_published = 1 ORDER BY sort_order')
    .all() as { slug: string; title: string }[],
);

export const getNavPages = cache((): { slug: string; nav_label: string }[] =>
  getDb()
    .prepare(
      'SELECT slug, nav_label FROM pages WHERE is_published = 1 AND show_in_nav = 1 ORDER BY sort_order',
    )
    .all() as { slug: string; nav_label: string }[],
);
