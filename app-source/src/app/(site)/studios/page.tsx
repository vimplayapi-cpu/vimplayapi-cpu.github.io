import type { Metadata } from 'next';

import { CtaBand } from '@/components/layout/CtaBand';
import { Reveal } from '@/components/motion/Reveal';
import { StudioCard } from '@/components/studios/StudioCard';
import { EmptyState, SectionIntro } from '@/components/ui';
import { block, getBlocks, getStudios } from '@/lib/db/queries';
import { buildMetadata } from '@/lib/seo';

/**
 * Rendered per request so content-management changes appear immediately.
 * All data comes from local SQLite, so this stays cheap.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildMetadata({ route: '/studios' });

export default function StudiosPage() {
  const blocks = getBlocks('studios');
  const studios = getStudios();
  const ctaImage =
    studios.find((s) => s.slug === 'midnight-galaxy')?.images.find((i) => i.role === 'wide') ??
    studios[0]?.images[0] ??
    null;

  return (
    <>
      <section className="border-b border-hairline pb-16 pt-40 sm:pt-48" aria-labelledby="studios-heading">
        <div className="shell">
          <Reveal>
            <SectionIntro
              eyebrow={block(blocks, 'hero.eyebrow', 'Studio environments')}
              headline={block(blocks, 'hero.headline', 'TEN STUDIO\nENVIRONMENTS.')}
              body={block(blocks, 'hero.body')}
              as="h1"
              size="lg"
              className="max-w-4xl"
            />
          </Reveal>

          <Reveal delay={120}>
            <p className="mt-10 font-mono text-tech uppercase text-muted">
              {studios.length} {studios.length === 1 ? 'environment' : 'environments'} · four reference
              frames each
            </p>
          </Reveal>
        </div>
      </section>

      <section className="section" aria-label="Studio list">
        <div className="shell">
          {studios.length === 0 ? (
            <EmptyState
              title="NO STUDIOS PUBLISHED"
              body="Studio environments are created and published from the back office."
            />
          ) : (
            <div className="grid gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
              {studios.map((studio, i) => (
                <Reveal key={studio.id} delay={(i % 3) * 90}>
                  <StudioCard
                    studio={studio}
                    index={i + 1}
                    total={studios.length}
                    priority={i < 3}
                  />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      <CtaBand
        headline={block(blocks, 'inquiry.headline', 'NEED AN ENVIRONMENT\nTHAT IS NOT LISTED?')}
        body={block(blocks, 'inquiry.body')}
        ctaLabel="REQUEST A DEMO"
        image={ctaImage}
        secondary={{ label: 'CUSTOM STUDIO DESIGN', href: '/services/custom-studio-design' }}
      />
    </>
  );
}
