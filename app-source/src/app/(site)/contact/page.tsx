import type { Metadata } from 'next';

import { ContactForm } from '@/components/forms/ContactForm';
import { Reveal } from '@/components/motion/Reveal';
import { Eyebrow, Index, SectionIntro } from '@/components/ui';
import {
  block, getBlocks, getLocations, getServices, getSettings, setting,
} from '@/lib/db/queries';
import { buildMetadata } from '@/lib/seo';

/**
 * Rendered per request so content-management changes appear immediately.
 * All data comes from local SQLite, so this stays cheap.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildMetadata({ route: '/contact' });

export default function ContactPage() {
  const blocks = getBlocks('contact');
  const settings = getSettings();
  const services = getServices();
  const locations = getLocations();

  const email = setting(settings, 'contact.email', 'miracle@gmail.com');
  const phone = setting(settings, 'contact.phone');

  return (
    <>
      <section className="border-b border-hairline pb-16 pt-40 sm:pt-48" aria-labelledby="contact-heading">
        <div className="shell">
          <Reveal>
            <SectionIntro
              eyebrow={block(blocks, 'hero.eyebrow', 'Contact')}
              headline={block(blocks, 'hero.headline', "LET'S BUILD SOMETHING LIVE.")}
              body={block(blocks, 'hero.body')}
              as="h1"
              className="max-w-4xl"
            />
          </Reveal>
        </div>
      </section>

      <section className="section" aria-label="Contact details and inquiry form">
        <div className="shell grid gap-16 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          {/* Details */}
          <Reveal>
            <div className="lg:sticky lg:top-32">
              <Eyebrow className="mb-7">Direct</Eyebrow>

              <a
                href={`mailto:${email}`}
                className="link-draw block font-display text-2xl font-semibold tracking-tight text-chalk sm:text-3xl"
              >
                {email}
              </a>

              {phone && (
                <a href={`tel:${phone}`} className="link-draw mt-4 block text-lg text-mist">
                  {phone}
                </a>
              )}

              <h2 className="tech-label mb-6 mt-14">Markets</h2>
              <ul className="border-t border-hairline">
                {locations.map((loc, i) => (
                  <li
                    key={loc.slug}
                    className="flex items-baseline justify-between gap-4 border-b border-hairline py-4"
                  >
                    <span className="flex items-baseline gap-5">
                      <Index value={i + 1} />
                      <span className="font-display text-lg font-semibold uppercase tracking-tight text-chalk">
                        {loc.country}
                      </span>
                    </span>
                    {loc.studioCount > 0 && (
                      <span className="font-mono text-tech-sm uppercase tabular text-muted">
                        {loc.studioCount} studios
                      </span>
                    )}
                  </li>
                ))}
              </ul>

              <p className="mt-8 max-w-xs text-sm leading-relaxed text-muted">
                Site addresses are published only where an administrator has supplied them. Email us
                for site details and access arrangements.
              </p>
            </div>
          </Reveal>

          {/* Form */}
          <Reveal delay={120}>
            <h2 className="mb-10 font-display text-2xl font-semibold uppercase tracking-tight text-chalk">
              {block(blocks, 'form.title', 'SEND AN INQUIRY')}
            </h2>
            <ContactForm
              services={services.map((s) => ({ slug: s.slug, title: s.title }))}
              submitLabel={block(blocks, 'form.cta', 'SEND INQUIRY')}
              successTitle={block(blocks, 'success.title', 'THANK YOU.')}
              successBody={block(
                blocks,
                'success.body',
                'YOUR INQUIRY HAS BEEN RECEIVED. WE WILL RESPOND BY EMAIL.',
              )}
            />
          </Reveal>
        </div>
      </section>
    </>
  );
}
