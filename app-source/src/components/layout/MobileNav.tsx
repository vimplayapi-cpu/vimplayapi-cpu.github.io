'use client';

import Link from '@/components/ui/SiteLink';
import { useEffect, useRef } from 'react';

import type { NavItem } from './Header';
import { LiveSignal } from '@/components/brand/Wordmark';
import { Arrow } from '@/components/ui';
import { cn } from '@/lib/cn';
import { usePrefersReducedMotion } from '@/lib/motion/useGsap';

/**
 * Full-screen mobile navigation.
 *
 * This is a separate composition rather than a scaled-down desktop nav: large
 * display type, an index numeral per item, staggered entry, and a persistent
 * demo CTA pinned to the bottom.
 *
 * Accessibility: the drawer is a modal dialog — background scroll is locked,
 * focus is trapped, Escape closes it, and focus returns to the toggle.
 */
export function MobileNav({
  open,
  onClose,
  items,
  ctaLabel,
  demoHref,
  currentPath,
}: {
  open: boolean;
  onClose: () => void;
  items: NavItem[];
  ctaLabel: string;
  demoHref: string;
  currentPath: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.querySelector<HTMLButtonElement>('[data-menu-close]')?.focus();
    return () => { previous?.focus(); };
  }, [open]);

  // Lock background scroll while open.
  useEffect(() => {
    if (!open) return;
    const { body } = document;
    const prev = body.style.overflow;
    body.style.overflow = 'hidden';
    return () => {
      body.style.overflow = prev;
    };
  }, [open]);

  // Escape to close, plus a focus trap inside the panel.
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
      );
      if (!focusables?.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const isActive = (href: string) =>
    href === '/' ? currentPath === '/' : currentPath === href || currentPath.startsWith(`${href}/`);

  return (
    <div
      ref={panelRef}
      id="mobile-nav"
      role="dialog"
      aria-modal="true"
      aria-label="Main menu"
      // Kept mounted so the exit transition can play; hidden from AT when closed.
      aria-hidden={!open}
      inert={!open}
      className={cn(
        'fixed inset-0 z-[120] flex flex-col bg-void lg:hidden',
        'transition-[opacity,visibility] duration-500 ease-cinematic',
        open ? 'visible opacity-100' : 'invisible opacity-0',
      )}
    >
      {/* Background plate: a very dark studio wash that drifts slowly while open */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.16]"
        style={{
          background:
            'radial-gradient(80% 55% at 78% 8%, rgba(61,220,232,0.5) 0%, transparent 60%),' +
            'radial-gradient(70% 50% at 12% 92%, rgba(61,220,232,0.28) 0%, transparent 62%)',
          transform: open && !reduced ? 'scale(1.08)' : 'scale(1)',
          transition: 'transform 3200ms cubic-bezier(0.16,1,0.3,1)',
        }}
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 grain" />

      {/* Spacer matching the header so the logo stays put behind the overlay */}
      <div style={{ height: 'var(--shell-header)' }} className="shrink-0" />

      <nav aria-label="Main" className="shell relative flex min-h-0 flex-1 flex-col justify-center">
        <div className="mobile-menu-heading"><span>EXPLORE LIVE MIRACLE</span><button data-menu-close type="button" onClick={onClose} aria-label="Close navigation">Close <span aria-hidden>×</span></button></div>
        <ul className="flex flex-col">
          {items.map((item, i) => {
            const active = isActive(item.href);
            return (
              <li key={item.href} className="border-b border-hairline first:border-t">
                <Link
                  href={item.href}
                  onClick={onClose}
                  aria-current={active ? 'page' : undefined}
                  className="group flex items-baseline gap-5 py-5"
                  style={{
                    opacity: open ? 1 : 0,
                    transform: open ? 'none' : 'translateY(1.5rem)',
                    transition: reduced
                      ? 'none'
                      : `opacity 620ms cubic-bezier(0.16,1,0.3,1) ${140 + i * 65}ms,` +
                        `transform 620ms cubic-bezier(0.16,1,0.3,1) ${140 + i * 65}ms`,
                  }}
                >
                  <span className="tech-index w-6 shrink-0">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span
                    className={cn(
                      'font-display text-[2rem] font-semibold uppercase leading-none tracking-tight transition-colors duration-300 sm:text-[2.5rem]',
                      active ? 'text-signal' : 'text-chalk',
                    )}
                  >
                    {item.label}
                  </span>
                  {active && (
                    <span aria-hidden className="ml-auto self-center">
                      <span className="block h-1.5 w-1.5 rounded-full bg-signal" />
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        <div
          className="mt-10 flex flex-col gap-6"
          style={{
            opacity: open ? 1 : 0,
            transition: reduced
              ? 'none'
              : `opacity 700ms cubic-bezier(0.16,1,0.3,1) ${180 + items.length * 65}ms`,
          }}
        >
          <LiveSignal />
          <a href="mailto:miracle@gmail.com" className="link-draw font-mono text-tech uppercase text-mist">
            miracle@gmail.com
          </a>
          <p className="font-mono text-tech-sm uppercase text-muted">
            Georgia · Armenia · Bulgaria · Ukraine
          </p>
        </div>
      </nav>

      {/* Sticky demo CTA */}
      <div className="shell relative shrink-0 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5">
        <Link href={demoHref} onClick={onClose} className="btn btn-primary group w-full">
          {ctaLabel}
          <Arrow />
        </Link>
      </div>
    </div>
  );
}
