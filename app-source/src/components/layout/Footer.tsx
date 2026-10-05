import Link from '@/components/ui/SiteLink';

import { LiveSignal, Wordmark } from '@/components/brand/Wordmark';
import { Arrow } from '@/components/ui';

export interface FooterLocation {
  slug: string;
  country: string;
  city: string;
}

export interface FooterSocial {
  label: string;
  href: string;
}

/**
 * Site footer. Renders as a technical index of the site rather than a
 * decorative sign-off: navigation, capability list, markets and contact,
 * on a strict hairline grid.
 */
export function Footer({
  statement,
  legalLine,
  email,
  locations,
  services,
  socials,
  ctaLabel,
}: {
  statement: string;
  legalLine: string;
  email: string;
  locations: FooterLocation[];
  services: { slug: string; title: string }[];
  socials: FooterSocial[];
  ctaLabel: string;
}) {
  const year = new Date().getFullYear();

  return (
    <footer className="brand-footer on-photo relative border-t border-hairline bg-midnight">
      <div className="shell py-16 sm:py-20">
        <div className="grid gap-14 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* Identity */}
          <div>
            <Wordmark animate={false} />
            <p className="mt-6 max-w-xs text-sm leading-relaxed text-muted">{statement}</p>
            <LiveSignal className="mt-8" />
          </div>

          {/* Navigation */}
          <nav aria-labelledby="footer-nav">
            <h2 id="footer-nav" className="tech-label mb-5">
              Navigate
            </h2>
            <ul className="space-y-3">
              {[
                { href: '/', label: 'Home' },
                { href: '/about', label: 'About' },
                { href: '/services', label: 'Services' },
                { href: '/studios', label: 'Studios' },
                { href: '/gallery', label: 'Gallery' },
                { href: '/contact', label: 'Contact' },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="link-draw text-sm text-mist hover:text-chalk">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Services */}
          <nav aria-labelledby="footer-services">
            <h2 id="footer-services" className="tech-label mb-5">
              Services
            </h2>
            <ul className="space-y-3">
              {services.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={`/services/${s.slug}`}
                    className="link-draw text-sm text-mist hover:text-chalk"
                  >
                    {s.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Contact + markets */}
          <div>
            <h2 className="tech-label mb-5">Contact</h2>
            <a href={`mailto:${email}`} className="link-draw text-sm text-chalk">
              {email}
            </a>

            <h3 className="tech-label mb-4 mt-8">Markets</h3>
            <ul className="space-y-2.5">
              {locations.map((l) => (
                <li key={l.slug} className="text-sm text-mist">
                  {l.country}
                </li>
              ))}
            </ul>

            {socials.length > 0 && (
              <>
                <h3 className="tech-label mb-4 mt-8">Follow</h3>
                <ul className="flex flex-wrap gap-4">
                  {socials.map((s) => (
                    <li key={s.href}>
                      <a
                        href={s.href}
                        target="_blank"
                        rel="noopener noreferrer me"
                        className="link-draw font-mono text-tech uppercase text-mist hover:text-chalk"
                      >
                        {s.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>

        {/* Demo CTA rail */}
        <div className="mt-16 flex flex-wrap items-center justify-between gap-6 border-t border-hairline pt-8">
          <p className="font-display text-xl font-semibold uppercase tracking-tight text-chalk sm:text-2xl">
            Ready to plan a studio?
          </p>
          <Link href="/demo" className="btn btn-secondary group">
            {ctaLabel}
            <Arrow />
          </Link>
        </div>

        {/* Legal */}
        <div className="mt-10 flex flex-wrap items-center justify-between gap-x-8 gap-y-4 border-t border-hairline pt-8">
          <p className="font-mono text-tech-sm uppercase text-muted">
            {legalLine.replace('{year}', String(year))}
          </p>
          <ul className="flex flex-wrap gap-x-7 gap-y-2">
            {[
              { href: '/privacy', label: 'Privacy' },
              { href: '/cookies', label: 'Cookies' },
              { href: '/terms', label: 'Terms' },
            ].map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="link-draw font-mono text-tech-sm uppercase text-muted hover:text-mist"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
