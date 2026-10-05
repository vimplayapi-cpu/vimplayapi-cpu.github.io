import type { Metadata } from 'next';
import Link from '@/components/ui/SiteLink';

import { Capabilities, type CapabilityEntry } from '@/components/home/Capabilities';
import { Hero } from '@/components/home/Hero';
import { Workflow } from '@/components/home/Workflow';
import { CtaBand } from '@/components/layout/CtaBand';
import { Reveal } from '@/components/motion/Reveal';
import { StudioCard } from '@/components/studios/StudioCard';
import { Arrow, SectionIntro } from '@/components/ui';
import { CAPABILITIES, WORKFLOW } from '@/lib/db/seed-data';
import {
  block, blockJson, getBlocks, getLocations, getSettings, getStudios, setting,
} from '@/lib/db/queries';
import { JsonLd, buildMetadata, organizationJsonLd } from '@/lib/seo';

/**
 * Rendered per request so content-management changes appear immediately.
 * All data comes from local SQLite, so this stays cheap.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildMetadata({ route: '/' });

export default function HomePage() {
  const blocks = getBlocks('home');
  const settings = getSettings();
  const studios = getStudios();
  const locations = getLocations();

  // The hero frame is the darkest, most overtly technical set in the library —
  // camera rigs and control surfaces rather than the gaming table.
  const heroStudio = studios.find((s) => s.slug === 'neon-noir') ?? studios[0];
  const heroImage =
    heroStudio?.images.find((i) => i.role === 'wide') ?? heroStudio?.images[0] ?? null;

  // Give each capability a photograph from a different studio, so the row of
  // six shows six real environments rather than repeating one.
  const capabilityImages = [
    'monte-carlo-classic', 'arctic-ice', 'neon-noir',
    'emerald-forest', 'tokyo-nights', 'midnight-galaxy',
  ];
  const capabilities: CapabilityEntry[] = CAPABILITIES.map((c, i) => {
    const studio = studios.find((s) => s.slug === capabilityImages[i]);
    return {
      key: c.key,
      title: c.title,
      description: c.description,
      icon: c.icon,
      href: `/services/${c.service}`,
      image: studio?.images.find((img) => img.role === 'alt') ?? studio?.images[0] ?? null,
      accent: studio?.accent ?? '#3DDCE8',
    };
  });

  const featured = studios.slice(0, 6);
  const ctaImage =
    studios.find((s) => s.slug === 'royal-velvet')?.images.find((i) => i.role === 'wide') ?? null;

  return (
    <>
      <JsonLd
        data={organizationJsonLd({
          name: setting(settings, 'site.name', 'Live Miracle'),
          description: setting(settings, 'seo.default.description'),
          email: setting(settings, 'contact.email', 'miracle@gmail.com'),
          countries: locations.map((l) => l.country),
          logo: '/brand/live-miracle-gold.png',
        })}
      />

      <Hero
        image={heroImage}
        eyebrow={block(blocks, 'hero.eyebrow', 'Broadcast studios & live production infrastructure')}
        headline={block(blocks, 'hero.headline', 'WE BUILD THE STUDIOS\nBEHIND LIVE BROADCAST.')}
        body={block(blocks, 'hero.body')}
        primaryCta={block(blocks, 'hero.cta.primary', 'REQUEST A STUDIO DEMO')}
        secondaryCta={block(blocks, 'hero.cta.secondary', 'EXPLORE OUR STUDIOS')}
        signalLines={blockJson<string[]>(blocks, 'hero.signal', ['LIVE', 'SIGNAL', 'ACTIVE'])}
        accent={heroStudio?.accent ?? '#3DDCE8'}
      />

      <Workflow
        eyebrow={block(blocks, 'workflow.eyebrow', 'How delivery works')}
        headline={block(blocks, 'workflow.headline', 'FROM CONCEPT\nTO LIVE SIGNAL.')}
        body={block(blocks, 'workflow.body')}
        steps={[...WORKFLOW]}
      />

      <Capabilities
        eyebrow={block(blocks, 'capabilities.eyebrow', 'Capabilities')}
        headline={block(blocks, 'capabilities.headline', 'WHAT WE DELIVER.')}
        body={block(blocks, 'capabilities.body')}
        items={capabilities}
      />

      {/* Studio environments teaser */}
      <section id="studio-environments" className="section border-t border-hairline" aria-label="Studio environments">
        <div className="shell">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-8">
              <SectionIntro
                eyebrow={block(blocks, 'studios.eyebrow', 'Studio environments')}
                headline={block(blocks, 'studios.headline', 'TEN ENVIRONMENTS.\nONE STANDARD.')}
                body={block(blocks, 'studios.body')}
                className="max-w-3xl"
              />
              <Link href="/studios" className="btn btn-secondary group shrink-0">
                ALL STUDIOS
                <Arrow />
              </Link>
            </div>
          </Reveal>

          <div className="lux-bento mt-16 grid gap-6">
            {featured.map((studio, i) => (
              <Reveal key={studio.id} delay={(i % 3) * 90}>
                <StudioCard studio={studio} index={i + 1} total={studios.length} sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 60vw" />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <CtaBand
        headline={block(blocks, 'cta.headline', "LET'S BUILD SOMETHING LIVE.")}
        body={block(blocks, 'cta.body')}
        ctaLabel="REQUEST A DEMO"
        image={ctaImage}
        secondary={{ label: 'CONTACT US', href: '/contact' }}
      />
    </>
  );
}
