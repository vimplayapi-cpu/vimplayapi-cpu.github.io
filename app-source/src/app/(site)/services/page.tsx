import type { Metadata } from 'next';
import Link from '@/components/ui/SiteLink';

import { CapabilityIcon } from '@/components/icons/CapabilityIcon';
import { CtaBand } from '@/components/layout/CtaBand';
import { Frame } from '@/components/media/Frame';
import { Reveal } from '@/components/motion/Reveal';
import { Arrow, EmptyState, SectionIntro } from '@/components/ui';
import { block, getBlocks, getServices, getStudios } from '@/lib/db/queries';
import { buildMetadata } from '@/lib/seo';

/**
 * Rendered per request so content-management changes appear immediately.
 * All data comes from local SQLite, so this stays cheap.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildMetadata({ route: '/services' });

/** Studio frames paired with each service, so the page shows real environments. */
const SERVICE_IMAGERY = [
  'monte-carlo-classic', 'riviera-rose', 'havana-gold',
  'neon-noir', 'tokyo-nights', 'arctic-ice',
];

export default function ServicesPage() {
  const blocks = getBlocks('services');
  const services = getServices();
  const studios = getStudios();

  const imageFor = (i: number) => {
    const studio = studios.find((s) => s.slug === SERVICE_IMAGERY[i % SERVICE_IMAGERY.length]);
    return {
      image: studio?.images.find((img) => img.role === 'wide') ?? studio?.images[0] ?? null,
      accent: studio?.accent ?? '#3DDCE8',
    };
  };

  return (
    <>
      <section className="border-b border-hairline pb-16 pt-40 sm:pt-48" aria-labelledby="services-heading">
        <div className="shell">
          <Reveal>
            <SectionIntro
              eyebrow={block(blocks, 'hero.eyebrow', 'Services')}
              headline={block(blocks, 'hero.headline', 'SIX SERVICES.\nONE DELIVERY CHAIN.')}
              body={block(blocks, 'hero.body')}
              as="h1"
              className="max-w-4xl"
            />
          </Reveal>
        </div>
      </section>

      <section className="section" aria-label="Service list">
        <div className="shell">
          {services.length === 0 ? (
            <EmptyState
              title="NO SERVICES PUBLISHED"
              body="Services are created and published from the back office."
            />
          ) : (
            <div className="space-y-24 lg:space-y-32">
              {services.map((service, i) => {
                const { image, accent } = imageFor(i);
                const flip = i % 2 === 1;

                return (
                  <article
                    key={service.id}
                    style={{ ['--studio-accent' as string]: accent }}
                    className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16"
                  >
                    {/* Imagery */}
                    <Reveal
                      from={flip ? 'right' : 'left'}
                      className={flip ? 'lg:order-2' : undefined}
                    >
                      <Link
                        href={`/services/${service.slug}`}
                        className="group panel frame-ticks relative block aspect-[5/4] overflow-hidden"
                        tabIndex={-1}
                        aria-hidden
                      >
                        {image && (
                          <>
                            <Frame
                              image={image}
                              sizes="(max-width: 1024px) 92vw, 46vw"
                              alt=""
                              className="absolute inset-0 h-full w-full"
                              imgClassName="h-full w-full object-cover transition-transform duration-[1600ms] ease-cinematic group-hover:scale-[1.05]"
                            />
                            <span
                              aria-hidden
                              className="absolute inset-0"
                              style={{
                                background: `linear-gradient(to top, rgba(5,7,10,0.86), rgba(5,7,10,0.20) 60%),
                                             linear-gradient(to bottom right, ${accent}1F, transparent 55%)`,
                              }}
                            />
                          </>
                        )}
                        <span className="absolute left-5 top-5 font-mono text-tech uppercase text-chalk/90">
                          {service.code}
                        </span>
                      </Link>
                    </Reveal>

                    {/* Copy */}
                    <Reveal from={flip ? 'left' : 'right'} delay={90}>
                      <div className="mb-6 flex items-center gap-4" style={{ color: accent }}>
                        <CapabilityIcon name={service.icon} size={32} />
                        <span className="font-mono text-tech uppercase">{service.code}</span>
                      </div>

                      <h2 className="text-display-sm uppercase text-chalk">{service.title}</h2>
                      <p className="mt-5 max-w-prose text-base leading-relaxed text-mist">
                        {service.summary}
                      </p>

                      {service.inclusions.length > 0 && (
                        <ul className="mt-8 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                          {service.inclusions.slice(0, 8).map((inc) => (
                            <li key={inc.title} className="flex gap-3 text-sm text-mist">
                              <span
                                aria-hidden
                                className="mt-[0.55em] block h-px w-3 shrink-0"
                                style={{ backgroundColor: accent }}
                              />
                              {inc.title}
                            </li>
                          ))}
                        </ul>
                      )}

                      <Link href={`/services/${service.slug}`} className="btn btn-secondary group mt-10">
                        EXPLORE {service.code}
                        <Arrow />
                      </Link>
                    </Reveal>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <CtaBand
        headline={block(blocks, 'cta.headline', "LET'S BUILD YOUR NEXT STUDIO.")}
        body={block(blocks, 'cta.body')}
        ctaLabel="REQUEST A DEMO"
        image={studios.find((s) => s.slug === 'emerald-forest')?.images[0] ?? null}
        secondary={{ label: 'VIEW STUDIOS', href: '/studios' }}
      />
    </>
  );
}
