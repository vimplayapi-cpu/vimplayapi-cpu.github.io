import type { MetadataRoute } from 'next';

import { getPublishedPages, getServiceSlugs, getSettings, getStudioSlugs, setting } from '@/lib/db/queries';
import { siteUrl } from '@/lib/env';

export const dynamic = 'force-dynamic';

/**
 * Sitemap built from what is actually published in the CMS — unpublishing a
 * studio removes it here too, rather than leaving a 404 in the index.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = (setting(getSettings(), 'site.url') || siteUrl()).replace(/\/+$/, '');
  const now = new Date();

  const priorityFor = (path: string): number => {
    if (path === '/') return 1;
    if (['/studios', '/services', '/demo'].includes(path)) return 0.9;
    if (['/about', '/gallery', '/contact'].includes(path)) return 0.8;
    if (path.startsWith('/studios/') || path.startsWith('/services/')) return 0.7;
    return 0.3;
  };

  const paths = [
    ...getPublishedPages().map((p) => (p.slug === '' ? '/' : `/${p.slug}`)),
    ...getStudioSlugs().map((s) => `/studios/${s}`),
    ...getServiceSlugs().map((s) => `/services/${s}`),
  ];

  return [...new Set(paths)].map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === '/' ? 'weekly' : 'monthly',
    priority: priorityFor(path),
  }));
}
