import type { Metadata } from 'next';
import { Suspense } from 'react';

import { DemoForm } from '@/components/forms/DemoForm';
import { Frame } from '@/components/media/Frame';
import { Reveal } from '@/components/motion/Reveal';
import { SectionIntro } from '@/components/ui';
import { block, getBlocks, getServices, getStudioOptions, getStudios } from '@/lib/db/queries';
import { buildMetadata } from '@/lib/seo';

/**
 * Rendered per request so content-management changes appear immediately.
 * All data comes from local SQLite, so this stays cheap.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildMetadata({ route: '/demo' });

export default function DemoPage() {
  const blocks = getBlocks('demo');
  const studios = getStudioOptions();
  const services = getServices();
  const allStudios = getStudios();

  const heroImage =
    allStudios.find((s) => s.slug === 'riviera-rose')?.images.find((i) => i.role === 'wide') ?? null;

  return (
    <>
      <section className="relative isolate overflow-hidden border-b border-hairline pb-16 pt-40 sm:pt-48">
        {heroImage && (
          <>
            <Frame
              image={heroImage}
              sizes="100vw"
              priority
              alt=""
              className="absolute inset-0 -z-10 h-full w-full"
              imgClassName="h-full w-full object-cover"
            />
            <div
              aria-hidden
              className="absolute inset-0 -z-10"
              style={{
                background:
                  'linear-gradient(to top, rgba(5,7,10,0.98) 10%, rgba(5,7,10,0.85) 55%, rgba(5,7,10,0.6) 100%)',
              }}
            />
            <div aria-hidden className="absolute inset-0 -z-10 grain" />
          </>
        )}

        <div className="shell relative">
          <Reveal>
            <SectionIntro
              eyebrow={block(blocks, 'hero.eyebrow', 'Studio demo')}
              headline={block(blocks, 'hero.headline', 'REQUEST A\nSTUDIO DEMO.')}
              body={block(blocks, 'hero.body')}
              as="h1"
              className="max-w-4xl"
            />
          </Reveal>
        </div>
      </section>

      <section className="section" aria-label="Studio demo request form">
        <div className="shell max-w-4xl">
          <Reveal>
            {/*
              useSearchParams (used to preselect a studio from the query string)
              requires a Suspense boundary during prerender.
            */}
            <Suspense fallback={<FormSkeleton />}>
              <DemoForm
                studios={studios}
                services={services.map((s) => ({ slug: s.slug, title: s.title }))}
                submitLabel={block(blocks, 'form.cta', 'SUBMIT STUDIO INQUIRY')}
                successTitle={block(blocks, 'success.title', 'THANK YOU.')}
                successBody={block(
                  blocks,
                  'success.body',
                  'YOUR STUDIO INQUIRY HAS BEEN RECEIVED.',
                )}
                successNote={block(blocks, 'success.note')}
              />
            </Suspense>
          </Reveal>
        </div>
      </section>
    </>
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      {[0, 1, 2].map((group) => (
        <div key={group} className="border-t border-hairline pt-8">
          <div className="mb-6 h-3 w-32 animate-pulse bg-graphite" />
          <div className="grid gap-6 sm:grid-cols-2">
            {[0, 1, 2, 3].map((f) => (
              <div key={f}>
                <div className="mb-3 h-2.5 w-24 animate-pulse bg-graphite" />
                <div className="h-12 animate-pulse bg-graphite/60" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
