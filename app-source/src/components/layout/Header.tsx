'use client';

import Link from '@/components/ui/SiteLink';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { MobileNav } from './MobileNav';
import { Wordmark } from '@/components/brand/Wordmark';
import { Arrow } from '@/components/ui';
import { cn } from '@/lib/cn';

export interface NavItem {
  href: string;
  label: string;
}

/**
 * Site header.
 *
 * Sits over the hero at the top of the page and acquires a solid ground once
 * scrolled, so the cinematic hero is never boxed in by a bar. The desktop nav
 * marks the current section with an accent rule rather than a colour change,
 * which keeps the type weight even across the row.
 */
export function Header({
  items,
  ctaLabel,
  demoHref = '/demo',
}: {
  items: NavItem[];
  ctaLabel: string;
  demoHref?: string;
}) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <header
        className={cn(
          'lux-header fixed inset-x-0 top-0 transition-all duration-500 ease-cinematic',
          // The header establishes its own stacking context, so its children
          // cannot escape it. While the drawer is open the whole header is
          // lifted above it, which keeps the logo and the close button
          // reachable — the drawer would otherwise cover them.
          menuOpen ? 'z-[130]' : 'z-[100]',
          menuOpen
            ? 'border-b border-transparent bg-transparent'
            : scrolled
              ? 'border-b border-hairline bg-void/88 backdrop-blur-xl'
              : 'border-b border-transparent bg-gradient-to-b from-void/70 to-transparent',
        )}
        style={{ height: 'var(--shell-header)' }}
      >
        <div className="shell flex h-full items-center justify-between gap-6">
          <Link
            href="/"
            className="shrink-0 py-2"
            aria-label="Live Miracle — home"
            aria-current={pathname === '/' ? 'page' : undefined}
          >
            <Wordmark />
          </Link>

          {/* Desktop navigation */}
          <nav aria-label="Main" className="hidden lg:block">
            <ul className="flex items-center gap-9">
              {items.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'relative block py-2 font-mono text-tech uppercase transition-colors duration-300',
                        active ? 'text-chalk' : 'text-mist hover:text-chalk',
                      )}
                    >
                      {item.label}
                      <span
                        aria-hidden
                        className={cn(
                          'absolute -bottom-0.5 left-0 block h-px bg-signal transition-transform duration-500 ease-cinematic',
                          active ? 'w-full scale-x-100' : 'w-full scale-x-0',
                        )}
                        style={{ transformOrigin: 'left' }}
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href={demoHref}
              className="btn btn-primary group hidden py-3.5 lg:inline-flex"
            >
              {ctaLabel}
              <Arrow />
            </Link>

            {/* Animated hamburger */}
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              className="relative -mr-2 flex h-11 w-11 items-center justify-center lg:hidden"
            >
              <span className="flex w-6 flex-col gap-[6px]">
                <span
                  className={cn(
                    'block h-px w-full bg-chalk transition-all duration-500 ease-cinematic',
                    menuOpen && 'translate-y-[7px] rotate-45',
                  )}
                />
                <span
                  className={cn(
                    'block h-px w-full bg-chalk transition-all duration-300 ease-cinematic',
                    menuOpen ? 'scale-x-0 opacity-0' : 'opacity-100',
                  )}
                />
                <span
                  className={cn(
                    'block h-px w-full bg-chalk transition-all duration-500 ease-cinematic',
                    menuOpen && '-translate-y-[7px] -rotate-45',
                  )}
                />
              </span>
            </button>
          </div>
        </div>
      </header>

      <MobileNav
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        items={items}
        ctaLabel={ctaLabel}
        demoHref={demoHref}
        currentPath={pathname}
      />
    </>
  );
}
