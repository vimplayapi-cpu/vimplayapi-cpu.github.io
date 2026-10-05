'use client';

import { useEffect, useState } from 'react';

/**
 * Floating WhatsApp contact.
 *
 * Rendered only when an administrator has both enabled the feature and saved an
 * official business number (brief §21) — the number is never hard-coded in the
 * frontend, it arrives from site settings via props on the server.
 *
 * On mobile it sits above the sticky demo CTA rather than on top of it.
 */
export function WhatsAppButton({
  number,
  message,
}: {
  number: string;
  message: string;
}) {
  const [visible, setVisible] = useState(false);

  // Appear after the hero, so it never competes with the first impression.
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.6);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const digits = number.replace(/\D/g, '');
  if (!digits) return null;

  const href = `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ''}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contact Live Miracle on WhatsApp"
      className={[
        'fixed right-4 z-[90] flex h-13 w-13 items-center justify-center border border-hairline-strong',
        'bg-charcoal/90 text-chalk backdrop-blur-md transition-all duration-500 ease-cinematic',
        'hover:border-ready hover:text-ready sm:right-6',
        // Clear the mobile sticky CTA; sit lower on desktop where there is none.
        'bottom-[calc(5.5rem+env(safe-area-inset-bottom))] lg:bottom-6',
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0',
      ].join(' ')}
      style={{ height: '3.25rem', width: '3.25rem' }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden fill="currentColor">
        <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.65-2.05-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.47s1.06 2.87 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.28.17-1.41-.07-.13-.27-.2-.57-.35z" />
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm0 18.15h-.01c-1.52 0-3.02-.41-4.32-1.18l-.31-.18-3.21.84.86-3.13-.2-.32a8.2 8.2 0 0 1-1.26-4.37c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.83 2.41a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.23 8.23z" />
      </svg>
    </a>
  );
}
