import type { Metadata } from 'next';

import { getSeo, getSettings, setting } from '@/lib/db/queries';
import { siteUrl } from '@/lib/env';

/**
 * Builds per-route metadata from the CMS.
 *
 * Route-level records in `seo_metadata` win; anything missing falls back to the
 * site defaults in settings, then to hard-coded copy. Overrides let a dynamic
 * page (a studio, a service) supply its own title/description without needing
 * a row per slug.
 */
export function buildMetadata({
  route,
  title,
  description,
  image,
  type = 'website',
  noIndex = false,
}: {
  route: string;
  title?: string;
  description?: string;
  image?: string | null;
  type?: 'website' | 'article';
  noIndex?: boolean;
}): Metadata {
  const settings = getSettings();
  const record = getSeo(route);

  const base = setting(settings, 'site.url') || siteUrl();
  const resolvedTitle =
    record?.title ||
    title ||
    setting(settings, 'seo.default.title', 'Live Miracle — Broadcast Studios & Live Production Infrastructure');
  const resolvedDescription =
    record?.description || description || setting(settings, 'seo.default.description');
  const resolvedImage =
    record?.ogImage || image || setting(settings, 'seo.og.image', '/og-image.png');
  const canonical = record?.canonical || `${base.replace(/\/+$/, '')}${route}`;
  const robots = noIndex ? 'noindex,nofollow' : record?.robots || setting(settings, 'seo.robots', 'index,follow');

  const absoluteImage = resolvedImage?.startsWith('http')
    ? resolvedImage
    : `${base.replace(/\/+$/, '')}${resolvedImage}`;

  return {
    // `absolute` stops the root layout's "%s — Live Miracle" template from
    // double-suffixing titles that already name the brand.
    title: { absolute: resolvedTitle },
    description: resolvedDescription,
    alternates: { canonical },
    robots,
    openGraph: {
      type,
      url: canonical,
      title: resolvedTitle,
      description: resolvedDescription,
      siteName: setting(settings, 'site.name', 'Live Miracle'),
      images: absoluteImage ? [{ url: absoluteImage, width: 1200, height: 630, alt: resolvedTitle }] : undefined,
      locale: 'en',
    },
    twitter: {
      card: 'summary_large_image',
      title: resolvedTitle,
      description: resolvedDescription,
      images: absoluteImage ? [absoluteImage] : undefined,
    },
  };
}

/**
 * Organisation structured data.
 *
 * Only asserts what we actually know: name, description, contact email and the
 * countries served. No invented founding date, employee count or rating.
 */
export function organizationJsonLd(opts: {
  name: string;
  description: string;
  email: string;
  countries: string[];
  logo: string;
}) {
  const base = siteUrl().replace(/\/+$/, '');
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: opts.name,
    url: base,
    logo: `${base}${opts.logo}`,
    description: opts.description,
    email: opts.email,
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'sales',
        email: opts.email,
        availableLanguage: ['en'],
      },
    ],
    areaServed: opts.countries.map((c) => ({ '@type': 'Country', name: c })),
  };
}

/** Breadcrumbs for detail pages. */
export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  const base = siteUrl().replace(/\/+$/, '');
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${base}${item.path}`,
    })),
  };
}

/** Renders a JSON-LD script tag. */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // Structured data is generated server-side from our own database, and
      // JSON.stringify escapes the payload; there is no user HTML here.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}
