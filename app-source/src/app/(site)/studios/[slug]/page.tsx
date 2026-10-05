import type { Metadata } from 'next';
import Link from '@/components/ui/SiteLink';
import { notFound } from 'next/navigation';

import { Beacon } from '@/components/analytics/Beacon';
import { CtaBand } from '@/components/layout/CtaBand';
import { Frame } from '@/components/media/Frame';
import { VideoEmptyState, VideoPlayer } from '@/components/media/VideoPlayer';
import { Reveal } from '@/components/motion/Reveal';
import { StudioGallery } from '@/components/studios/StudioGallery';
import { Arrow, CmsValue, Eyebrow, Headline, Index, Prose, StatusPill } from '@/components/ui';
import { getStudioBySlug, getStudioSlugs, getStudios } from '@/lib/db/queries';
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
  const studio = getStudioBySlug(slug);
  // The 404 is raised here rather than only in the page body: metadata is
  // resolved before the response starts streaming, so this produces a real
  // HTTP 404. Raising it later — after the loading boundary has begun
  // streaming — would render the 404 page with a 200 status (a soft 404).
  if (!studio) notFound();

  const cover = studio.images.find((i) => i.role === 'wide') ?? studio.images[0];
  return buildMetadata({
    route: `/studios/${slug}`,
    title: studio.seoTitle || `${studio.name} — Studio Environment — Live Miracle`,
    description: studio.seoDescription || studio.description.slice(0, 160),
    image: cover?.webp ?? null,
    type: 'article',
  });
}

export default async function StudioDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const studio = getStudioBySlug(slug);
  if (!studio) notFound();

  const all = getStudios();
  const position = all.findIndex((s) => s.slug === studio.slug);
  const next = all[(position + 1) % all.length];

  const hero = studio.images.find((i) => i.role === 'wide') ?? studio.images[0] ?? null;
  const accent = studio.accent;

  const sections = [
    { id: 'overview', label: 'Overview' },
    { id: 'capabilities', label: 'Technical' },
    { id: 'gallery', label: 'Gallery' },
    { id: 'video', label: 'Video' },
    { id: 'location', label: 'Location' },
    { id: 'inquiry', label: 'Inquiry' },
  ];

  return (
    <div style={{ ['--studio-accent' as string]: accent }}>
      <Beacon type="studio_view" entityId={studio.id} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Studios', path: '/studios' },
          { name: studio.name, path: `/studios/${studio.slug}` },
        ])}
      />

      {/* Hero */}
      <section className="on-photo relative isolate flex min-h-[78svh] items-end overflow-hidden">
        {hero ? (
          <Frame
            image={hero}
            sizes="100vw"
            priority
            alt={hero.alt}
            className="absolute inset-0 -z-10 h-full w-full"
            imgClassName="h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 -z-10 bg-graphite" />
        )}
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background: `linear-gradient(to top, rgba(5,7,10,0.97) 6%, rgba(5,7,10,0.60) 45%, rgba(5,7,10,0.35) 100%),
                         linear-gradient(to bottom right, ${accent}1A, transparent 60%)`,
          }}
        />
        <div aria-hidden className="absolute inset-0 -z-10 grain" />

        <div className="shell relative w-full pb-16 pt-40">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link
              href="/studios"
              className="link-draw font-mono text-tech uppercase text-mist hover:text-chalk"
            >
              ← All studios
            </Link>
            <Index value={position + 1} total={all.length} />
          </div>

          <p className="mt-8 font-mono text-tech-lg uppercase" style={{ color: accent }}>
            {studio.code}
          </p>
          <Headline as="h1" size="lg" className="mt-4 text-chalk">
            {studio.name}
          </Headline>
          {studio.tagline && (
            <p className="mt-5 font-mono text-tech uppercase text-mist">{studio.tagline}</p>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <StatusPill status={studio.status} label={studio.statusLabel} />
            <Link href="#inquiry" className="btn btn-primary group">
              {studio.ctaLabel}
              <Arrow />
            </Link>
          </div>
        </div>
      </section>

      {/* Section rail */}
      <nav
        aria-label="Studio sections"
        className="sticky top-[var(--shell-header)] z-40 border-y border-hairline bg-void/90 backdrop-blur-lg"
      >
        <div className="shell">
          <ul className="flex gap-7 overflow-x-auto py-4" style={{ scrollbarWidth: 'none' }}>
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="whitespace-nowrap font-mono text-tech uppercase text-muted transition-colors hover:text-chalk"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Overview */}
      <section id="overview" className="section scroll-mt-32" aria-labelledby="overview-heading">
        <div className="shell grid gap-14 lg:grid-cols-[1.15fr_0.85fr]">
          <Reveal>
            <Eyebrow accent className="mb-7">
              Overview
            </Eyebrow>
            <h2 id="overview-heading" className="text-display-sm uppercase text-chalk">
              The environment
            </h2>
            <Prose text={studio.description} className="mt-7" />
            {studio.environment && (
              <>
                <h3 className="mt-12 font-mono text-tech uppercase text-muted">Set & coverage</h3>
                <Prose text={studio.environment} className="mt-4" />
              </>
            )}
          </Reveal>

          <Reveal delay={120}>
            <dl className="panel divide-y divide-[color:rgba(242,245,248,0.08)]">
              <div className="flex items-baseline justify-between gap-6 p-5">
                <dt className="tech-label">Capacity</dt>
                <dd className="text-right text-sm text-chalk">
                  <CmsValue value={studio.capacity} />
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-6 p-5">
                <dt className="tech-label">Status</dt>
                <dd className="text-right text-sm text-chalk">{studio.statusLabel}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-6 p-5">
                <dt className="tech-label">Availability</dt>
                <dd className="text-right text-sm text-chalk">
                  <CmsValue value={studio.availabilityNote} />
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-6 p-5">
                <dt className="tech-label">Location</dt>
                <dd className="text-right text-sm text-chalk">
                  {studio.location ? (
                    studio.location.country
                  ) : (
                    <CmsValue value="[ASSIGN LOCATION]" />
                  )}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-6 p-5">
                <dt className="tech-label">Reference frames</dt>
                <dd className="text-right text-sm tabular text-chalk">{studio.images.length}</dd>
              </div>
            </dl>

            {studio.characteristics.length > 0 && (
              <div className="mt-8">
                <h3 className="tech-label mb-5">Production characteristics</h3>
                <ul className="space-y-3">
                  {studio.characteristics.map((c) => (
                    <li key={c} className="flex gap-3 text-sm leading-relaxed text-mist">
                      <span
                        aria-hidden
                        className="mt-[0.55em] block h-px w-3 shrink-0"
                        style={{ backgroundColor: accent }}
                      />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Reveal>
        </div>
      </section>

      {/* Technical capabilities */}
      <section
        id="capabilities"
        className="section scroll-mt-32 border-t border-hairline"
        aria-labelledby="capabilities-heading"
      >
        <div className="shell">
          <Reveal>
            <Eyebrow accent className="mb-7">
              Technical capabilities
            </Eyebrow>
            <h2 id="capabilities-heading" className="text-display-sm uppercase text-chalk">
              Specification
            </h2>
            <p className="mt-6 max-w-prose text-sm leading-relaxed text-muted">
              Specification values are maintained by the administrator in the back office. Unset
              values are shown as pending rather than estimated.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-x-10 gap-y-0 border-t border-hairline sm:grid-cols-2">
            {studio.capabilities.map((spec, i) => (
              <Reveal key={spec.label} delay={(i % 2) * 60}>
                <div className="flex items-baseline justify-between gap-6 border-b border-hairline py-5">
                  <dt className="tech-label">{spec.label}</dt>
                  <dd className="text-right text-sm text-chalk">
                    <CmsValue value={spec.value} />
                  </dd>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section
        id="gallery"
        className="section scroll-mt-32 border-t border-hairline"
        aria-labelledby="gallery-heading"
      >
        <div className="shell">
          <Reveal>
            <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
              <div>
                <Eyebrow accent className="mb-7">
                  Gallery
                </Eyebrow>
                <h2 id="gallery-heading" className="text-display-sm uppercase text-chalk">
                  Four reference frames
                </h2>
              </div>
              <p className="font-mono text-tech-sm uppercase text-muted">
                Select any frame to enlarge
              </p>
            </div>
          </Reveal>

          <StudioGallery images={studio.images} studioName={studio.name} accent={accent} />
        </div>
      </section>

      {/* Video */}
      <section
        id="video"
        className="section scroll-mt-32 border-t border-hairline"
        aria-labelledby="video-heading"
      >
        <div className="shell">
          <Reveal>
            <Eyebrow accent className="mb-7">
              Video
            </Eyebrow>
            <h2 id="video-heading" className="mb-12 text-display-sm uppercase text-chalk">
              Studio walkthrough
            </h2>
          </Reveal>

          <Reveal delay={100}>
            <div className="mx-auto max-w-5xl">
              {studio.video ? (
                <VideoPlayer video={studio.video} accent={accent} />
              ) : (
                <VideoEmptyState />
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Location */}
      <section
        id="location"
        className="section scroll-mt-32 border-t border-hairline"
        aria-labelledby="location-heading"
      >
        <div className="shell">
          <Reveal>
            <Eyebrow accent className="mb-7">
              Location
            </Eyebrow>
            <h2 id="location-heading" className="text-display-sm uppercase text-chalk">
              Where this environment operates
            </h2>

            <div className="mt-8 max-w-prose">
              {studio.location ? (
                <p className="text-base leading-relaxed text-mist">
                  {studio.location.country}
                  {studio.location.city && !studio.location.city.startsWith('[')
                    ? ` — ${studio.location.city}`
                    : ''}
                  .{' '}
                  <Link href="/contact" className="link-draw text-chalk">
                    Contact us
                  </Link>{' '}
                  for site details and access arrangements.
                </p>
              ) : (
                <p className="text-base leading-relaxed text-muted">
                  This environment has not been assigned to a market yet. Live Miracle operates
                  across Georgia, Armenia, Bulgaria and Ukraine —{' '}
                  <Link href="/contact" className="link-draw text-chalk">
                    contact us
                  </Link>{' '}
                  to discuss availability.
                </p>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Inquiry */}
      <div id="inquiry" className="scroll-mt-32">
        <CtaBand
          headline={`INTERESTED IN\n${studio.name.toUpperCase()}?`}
          body="Tell us how you intend to operate and we will come back with availability, specification and next steps."
          ctaLabel={studio.ctaLabel}
          href={`/demo?studio=${studio.slug}`}
          image={studio.images.find((i) => i.role === 'alt') ?? hero}
          accent={accent}
          secondary={{ label: 'CONTACT US', href: '/contact' }}
        />
      </div>

      {/* Next studio */}
      {next && next.slug !== studio.slug && (
        <section className="border-t border-hairline" aria-label="Next studio">
          <Link href={`/studios/${next.slug}`} className="group block">
            <div className="shell flex flex-wrap items-center justify-between gap-6 py-10">
              <div>
                <p className="tech-label mb-2">Next environment</p>
                <p className="font-display text-2xl font-semibold uppercase tracking-tight text-chalk sm:text-3xl">
                  {next.name}
                </p>
              </div>
              <span
                className="flex items-center gap-3 font-mono text-tech uppercase text-mist transition-colors group-hover:text-chalk"
                style={{ ['--studio-accent' as string]: next.accent }}
              >
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
