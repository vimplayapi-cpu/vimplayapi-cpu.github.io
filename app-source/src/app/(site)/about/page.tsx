import type { Metadata } from 'next';

import { LocationsMap } from '@/components/about/LocationsMap';
import { TechDiagram } from '@/components/about/TechDiagram';
import { Timeline } from '@/components/about/Timeline';
import { CtaBand } from '@/components/layout/CtaBand';
import { Frame } from '@/components/media/Frame';
import { MaskReveal, Reveal } from '@/components/motion/Reveal';
import { Index, Prose, SectionIntro } from '@/components/ui';
import { PROMISES, TECH_NODES, WHY } from '@/lib/db/seed-data';
import { block, getBlocks, getLocations, getStudios, getTimeline } from '@/lib/db/queries';
import { buildMetadata } from '@/lib/seo';

/**
 * Rendered per request so content-management changes appear immediately.
 * All data comes from local SQLite, so this stays cheap.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildMetadata({ route: '/about' });

export default function AboutPage() {
  const blocks = getBlocks('about');
  const locations = getLocations();
  const studios = getStudios();
  const timeline = getTimeline();

  const heroStudio = studios.find((s) => s.slug === 'monte-carlo-classic') ?? studios[0];
  const heroImage = heroStudio?.images.find((i) => i.role === 'wide') ?? heroStudio?.images[0] ?? null;
  const visionImage =
    studios.find((s) => s.slug === 'arctic-ice')?.images.find((i) => i.role === 'tech') ?? null;
  const approachImage =
    studios.find((s) => s.slug === 'havana-gold')?.images.find((i) => i.role === 'alt') ?? null;

  return (
    <>
      {/* Hero */}
      <section className="on-photo relative isolate flex min-h-[68svh] items-end overflow-hidden">
        {heroImage && (
          <Frame
            image={heroImage}
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
            background:
              'linear-gradient(to top, rgba(5,7,10,0.97) 6%, rgba(5,7,10,0.74) 45%, rgba(5,7,10,0.42) 100%)',
          }}
        />
        <div aria-hidden className="absolute inset-0 -z-10 grain" />

        <div className="shell relative w-full pb-16 pt-40">
          <SectionIntro
            eyebrow={block(blocks, 'hero.eyebrow', 'About')}
            headline={block(blocks, 'hero.headline', 'ABOUT\nLIVE MIRACLE.')}
            body={block(blocks, 'hero.body')}
            as="h1"
            className="max-w-4xl"
          />
        </div>
      </section>

      {/* Company */}
      <section className="section" aria-labelledby="company-heading">
        <div className="shell grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <Reveal>
            <h2 id="company-heading" className="text-display-md uppercase text-chalk">
              {block(blocks, 'intro.headline', 'ONE OPERATION,\nNOT SIX SUPPLIERS.')
                .split('\n')
                .map((l, i) => (
                  <span key={i} className="block">
                    {l}
                  </span>
                ))}
            </h2>
          </Reveal>
          <Reveal delay={110}>
            <Prose text={block(blocks, 'intro.body')} className="[&_p]:text-lg" />
          </Reveal>
        </div>
      </section>

      {/* Vision */}
      <section className="section border-t border-hairline" aria-labelledby="vision-heading">
        <div className="shell grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
          <Reveal>
            <SectionIntro
              eyebrow={block(blocks, 'vision.eyebrow', 'Vision')}
              headline={block(
                blocks,
                'vision.headline',
                'BUILDING THE INFRASTRUCTURE\nFOR BETTER LIVE EXPERIENCES.',
              )}
              size="md"
            />
            <Prose text={block(blocks, 'vision.body')} className="mt-8" />
          </Reveal>

          {visionImage && (
            <MaskReveal className="panel frame-ticks relative aspect-[4/3] overflow-hidden">
              <Frame
                image={visionImage}
                sizes="(max-width: 1024px) 92vw, 46vw"
                alt={visionImage.alt}
                className="absolute inset-0 h-full w-full"
              />
            </MaskReveal>
          )}
        </div>
      </section>

      {/* Technology */}
      <section className="section border-t border-hairline" aria-labelledby="technology-heading">
        <div className="shell">
          <Reveal>
            <SectionIntro
              eyebrow={block(blocks, 'technology.eyebrow', 'Technology')}
              headline={block(blocks, 'technology.headline', 'ONE SIGNAL PATH,\nEND TO END.')}
              body={block(blocks, 'technology.body')}
              className="max-w-3xl"
            />
          </Reveal>

          <div className="mt-16">
            <TechDiagram nodes={[...TECH_NODES]} />
          </div>
        </div>
      </section>

      {/* Our promise */}
      <section className="section border-t border-hairline" aria-labelledby="promise-heading">
        <div className="shell">
          <Reveal>
            <SectionIntro
              eyebrow={block(blocks, 'promise.eyebrow', 'Our promise')}
              headline={block(blocks, 'promise.headline', 'FIVE THINGS\nWE HOLD TO.')}
              className="max-w-3xl"
            />
          </Reveal>

          <ol className="mt-16 border-t border-hairline">
            {PROMISES.map((p, i) => (
              <li key={p.key} className="border-b border-hairline">
                <Reveal delay={i * 70}>
                  <div className="grid gap-4 py-8 sm:grid-cols-[4rem_1fr_1.5fr] sm:items-baseline sm:gap-10">
                    <Index value={i + 1} total={PROMISES.length} />
                    <h3 className="font-display text-2xl font-semibold uppercase tracking-tight text-chalk">
                      {p.title}
                    </h3>
                    <p className="text-base leading-relaxed text-mist">{p.description}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Why Live Miracle */}
      <section className="section border-t border-hairline" aria-labelledby="why-heading">
        <div className="shell">
          <Reveal>
            <SectionIntro
              eyebrow={block(blocks, 'why.eyebrow', 'Why Live Miracle')}
              headline={block(blocks, 'why.headline', 'WHAT WE BRING\nTO THE BUILD.')}
              body={block(blocks, 'why.body')}
              className="max-w-3xl"
            />
          </Reveal>

          <div className="mt-16 grid gap-px border border-hairline bg-[rgba(242,245,248,0.08)] sm:grid-cols-2 lg:grid-cols-3">
            {WHY.map((w, i) => (
              <Reveal key={w.key} delay={(i % 3) * 70} className="bg-void">
                <div className="h-full bg-charcoal/40 p-8 transition-colors duration-500 hover:bg-charcoal">
                  <Index value={i + 1} />
                  <h3 className="mt-5 font-display text-lg font-semibold uppercase tracking-tight text-chalk">
                    {w.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{w.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Approach */}
      <section className="section border-t border-hairline" aria-labelledby="approach-heading">
        <div className="shell grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
          {approachImage && (
            <MaskReveal className="panel frame-ticks relative aspect-[4/3] overflow-hidden lg:order-2">
              <Frame
                image={approachImage}
                sizes="(max-width: 1024px) 92vw, 46vw"
                alt={approachImage.alt}
                className="absolute inset-0 h-full w-full"
              />
            </MaskReveal>
          )}
          <Reveal>
            <SectionIntro
              eyebrow={block(blocks, 'approach.eyebrow', 'Our approach')}
              headline={block(blocks, 'approach.headline', 'PLAN FOR OPERATION,\nNOT FOR HANDOVER.')}
              size="md"
            />
            <Prose text={block(blocks, 'approach.body')} className="mt-8" />
          </Reveal>
        </div>
      </section>

      {/* Locations */}
      <section className="section border-t border-hairline" aria-labelledby="locations-heading">
        <div className="shell">
          <Reveal>
            <SectionIntro
              eyebrow="Locations"
              headline={'FOUR MARKETS.\nONE OPERATION.'}
              body="Live Miracle operates across Georgia, Armenia, Bulgaria and Ukraine. Select a market for detail."
              className="max-w-3xl"
            />
          </Reveal>

          <div className="mt-16">
            <LocationsMap locations={locations} />
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="section border-t border-hairline" aria-labelledby="timeline-heading">
        <div className="shell">
          <Reveal>
            <SectionIntro
              eyebrow={block(blocks, 'timeline.eyebrow', 'Timeline')}
              headline={block(blocks, 'timeline.headline', 'COMPANY TIMELINE.')}
              body={block(blocks, 'timeline.body')}
              className="max-w-3xl"
            />
          </Reveal>

          <div className="mt-16">
            <Timeline events={timeline} />
          </div>
        </div>
      </section>

      <CtaBand
        headline={"LET'S BUILD SOMETHING LIVE."}
        body="Tell us what you need to broadcast and we will tell you what it takes to build it."
        ctaLabel="REQUEST A DEMO"
        image={studios.find((s) => s.slug === 'neon-noir')?.images.find((i) => i.role === 'alt') ?? null}
        secondary={{ label: 'VIEW SERVICES', href: '/services' }}
      />
    </>
  );
}
