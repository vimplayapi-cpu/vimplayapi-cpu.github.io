import type { MetadataRoute } from 'next';

import { getSettings, setting } from '@/lib/db/queries';
import { siteUrl } from '@/lib/env';

export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  const base = (setting(getSettings(), 'site.url') || siteUrl()).replace(/\/+$/, '');

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // The back office and every API route stay out of the index.
        disallow: ['/admin', '/admin/', '/api/'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
