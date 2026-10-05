import type { Metadata } from 'next';
import Link from '@/components/ui/SiteLink';
import { notFound } from 'next/navigation';

import { CapabilityIcon } from '@/components/icons/CapabilityIcon';
import { CtaBand } from '@/components/layout/CtaBand';
import { Frame } from '@/components/media/Frame';
import { Reveal } from '@/components/motion/Reveal';
import { Arrow, Eyebrow, Headline, Index, Prose } from '@/components/ui';
import { block, getBlocks, getServiceBySlug, getServiceSlugs, getServices, getStudios } from '@/lib/db/queries';
import { JsonLd, breadcrumbJsonLd, buildMetadata } from '@/lib/seo';

/**
 * Rendered per request so content-management changes appear immediately.
 * All data comes from local SQLite, so this stays cheap.
 */
export const dynamic = 'force-dynamic';


export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  // Raised during metadata resolution so the response carries a real 404 —
  // see the note on the studio route for why this cannot wait for the body.
  if (!service) notFound();

  return buildMetadata({
    route: `/services/${slug}`,
    title: service.seoTitle || `${service.title} — Live Miracle`,
    description: service.seoDescription || service.summary,
    type: 'article',
  });
}

/** Each service page is anchored by a different studio environment. */
const SERVICE_STUDIO: Record<string, string> = {
  'studio-provision': 'monte-carlo-classic',
  'custom-studio-design': 'riviera-rose',
  'shared-production': 'havana-gold',
  'streaming-technology': 'neon-noir',
  'production-staff': 'tokyo-nights',
  training: 'arctic-ice',
};

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) notFound();

  const globals = getBlocks('services');
  const services = getServices();
  const studios = getStudios();

  const position = services.findIndex((s) => s.slug === service.slug);
  const next = services[(position + 1) % services.length];

  const studio = studios.find((s) => s.slug === SERVICE_STUDIO[service.slug]) ?? studios[0];
  const accent = studio?.accent ?? '#3DDCE8';
  const hero = studio?.images.find((i) => i.role === 'wide') ?? studio?.images[0] ?? null;

  return (
    <div style={{ ['--studio-accent' as string]: accent }}>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Services', path: '/services' },
          { name: service.title, path: `/services/${service.slug}` },
        ])}
      />

      {/* Hero */}
      <section className="on-photo relative isolate flex min-h-[70svh] items-end overflow-hidden">
        {hero && (
          <Frame
            image={hero}
            sizes="100vw"
            priority
            alt=""
            className="absolute inset-0 -z-10 h-full w-full"
            imgClassName="h-full w-full object-cover"
          />
        )}
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background: `linear-gradient(to top, rgba(5,7,10,0.97) 8%, rgba(5,7,10,0.72) 50%, rgba(5,7,10,0.45) 100%),
                         linear-gradient(to bottom right, ${accent}1A, transparent 62%)`,
          }}
        />
        <div aria-hidden className="absolute inset-0 -z-10 grain" />

        <div className="shell relative w-full pb-16 pt-40">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link href="/services" className="link-draw font-mono text-tech uppercase text-mist hover:text-chalk">
              ← All services
            </Link>
            <Index value={position + 1} total={services.length} />
          </div>

          <div className="mt-8 flex items-center gap-4" style={{ color: accent }}>
            <CapabilityIcon name={service.icon} size={34} />
            <span className="font-mono text-tech-lg uppercase">{service.code}</span>
          </div>

          <Headline as="h1" size="lg" className="mt-5 text-chalk">
            {service.title}
          </Headline>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-mist sm:text-lg">
            {service.summary}
          </p>
        </div>
      </section>

      {/* Body */}
      <section className="section" aria-labelledby="detail-heading">
        <div className="shell grid gap-14 lg:grid-cols-[0.85fr_1.15fr]">
          <Reveal>
            <Eyebrow accent className="mb-7">
              What this covers
            </Eyebrow>
            <h2 id="detail-heading" className="text-display-sm uppercase text-chalk">
              In practice
            </h2>
          </Reveal>

          <Reveal delay={100}>
            <Prose text={service.body} className="[&_p]:text-lg" />
          </Reveal>
        </div>
      </section>

      {/* Inclusions */}
      {service.inclusions.length > 0 && (
        <section className="section border-t border-hairline" aria-labelledby="inclusions-heading">
          <div className="shell">
            <Reveal>
              <Eyebrow accent className="mb-7">
                Included
              </Eyebrow>
              <h2 id="inclusions-heading" className="text-display-sm uppercase text-chalk">
                Scope of delivery
              </h2>
            </Reveal>

            <ol className="mt-14 border-t border-hairline">
              {service.inclusions.map((inc, i) => (
                <li key={inc.title} className="border-b border-hairline">
                  <Reveal delay={i * 55}>
                    <div className="grid gap-4 py-7 sm:grid-cols-[3rem_1fr_1.4fr] sm:items-baseline sm:gap-8">
                      <Index value={i + 1} />
                      <h3 className="font-display text-lg font-semibold uppercase tracking-tight text-chalk">
                        {inc.title}
                      </h3>
                      <p className="text-sm leading-relaxed text-muted">{inc.description}</p>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* Related environments */}
      {studios.length > 0 && (
        <section className="section border-t border-hairline" aria-labelledby="environments-heading">
          <div className="shell">
            <Reveal>
              <div className="flex flex-wrap items-end justify-between gap-6">
                <div>
                  <Eyebrow accent className="mb-7">
                    Environments
                  </Eyebrow>
                  <h2 id="environments-heading" className="text-display-sm uppercase text-chalk">
                    Where this work lands
                  </h2>
                </div>
                <Link href="/studios" className="btn btn-secondary group">
                  ALL STUDIOS
                  <Arrow />
                </Link>
              </div>
            </Reveal>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {studios.slice(0, 4).map((s, i) => (
                <Reveal key={s.id} delay={i * 80}>
                  <Link
                    href={`/studios/${s.slug}`}
                    className="group panel frame-ticks relative block aspect-[3/4] overflow-hidden"
                    style={{ ['--studio-accent' as string]: s.accent }}
                  >
                    {s.images[0] && (
                      <Frame
                        image={s.images[0]}
                        sizes="(max-width: 640px) 92vw, 23vw"
                        alt={s.images[0].alt}
                        className="absolute inset-0 h-full w-full"
                        imgClassName="h-full w-full object-cover transition-transform duration-[1400ms] ease-cinematic group-hover:scale-105"
                      />
                    )}
                    <span
                      aria-hidden
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(to top, rgba(5,7,10,0.92), transparent 60%), linear-gradient(to bottom right, ${s.accent}1A, transparent 60%)`,
                      }}
                    />
                    <span className="absolute inset-x-0 bottom-0 p-4">
                      <span className="block font-mono text-tech-sm uppercase text-mist">{s.code}</span>
                      <span className="mt-1 block font-display text-lg font-semibold uppercase tracking-tight text-chalk">
                        {s.name}
                      </span>
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      <CtaBand
        headline={block(globals, 'cta.headline', "LET'S BUILD YOUR NEXT STUDIO.")}
        body={block(globals, 'cta.body')}
        ctaLabel={service.ctaLabel}
        image={studio?.images.find((i) => i.role === 'alt') ?? hero}
        accent={accent}
        secondary={{ label: 'CONTACT US', href: '/contact' }}
      />

      {next && next.slug !== service.slug && (
        <section className="border-t border-hairline" aria-label="Next service">
          <Link href={`/services/${next.slug}`} className="group block">
            <div className="shell flex flex-wrap items-center justify-between gap-6 py-10">
              <div>
                <p className="tech-label mb-2">Next service</p>
                <p className="font-display text-2xl font-semibold uppercase tracking-tight text-chalk sm:text-3xl">
                  {next.title}
                </p>
              </div>
              <span className="flex items-center gap-3 font-mono text-tech uppercase text-mist transition-colors group-hover:text-chalk">
                {next.code}
                <Arrow />
              </span>
            </div>
          </Link>
        </section>
      )}
    </div>
  );
}
