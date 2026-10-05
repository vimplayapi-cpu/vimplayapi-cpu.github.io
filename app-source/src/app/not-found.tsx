import Link from '@/components/ui/SiteLink';

import { Wordmark } from '@/components/brand/Wordmark';
import { Arrow } from '@/components/ui';
import { block, getBlocks } from '@/lib/db/queries';

export const metadata = {
  title: 'Signal not found — Live Miracle',
  robots: 'noindex,nofollow',
};

/**
 * 404. Rendered outside the site shell so a broken route never depends on
 * layout data that might itself be the cause of the failure.
 */
export default function NotFound() {
  const blocks = getBlocks('global');

  return (
    <main className="flex min-h-dvh flex-col">
      <div className="shell flex items-center py-8">
        <Link href="/" aria-label="Live Miracle — home">
          <Wordmark />
        </Link>
      </div>

      <div className="shell flex flex-1 flex-col justify-center py-20">
        <p className="font-mono text-tech-lg uppercase text-live">ERROR 404</p>

        <h1 className="mt-6 text-display-lg uppercase text-chalk">
          {block(blocks, 'notfound.headline', 'SIGNAL NOT FOUND')}
        </h1>

        <p className="mt-7 max-w-prose text-base leading-relaxed text-mist sm:text-lg">
          {block(
            blocks,
            'notfound.body',
            'The page you requested is not on this route. It may have been moved, or the link may be incomplete.',
          )}
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link href="/" className="btn btn-primary group">
            RETURN HOME
            <Arrow />
          </Link>
          <Link href="/studios" className="btn btn-secondary group">
            VIEW STUDIOS
            <Arrow />
          </Link>
        </div>

        <nav aria-label="Site sections" className="mt-16 border-t border-hairline pt-8">
          <ul className="flex flex-wrap gap-x-8 gap-y-3">
            {[
              { href: '/about', label: 'About' },
              { href: '/services', label: 'Services' },
              { href: '/studios', label: 'Studios' },
              { href: '/gallery', label: 'Gallery' },
              { href: '/contact', label: 'Contact' },
              { href: '/demo', label: 'Request a demo' },
            ].map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="link-draw font-mono text-tech uppercase text-mist hover:text-chalk"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </main>
  );
}
