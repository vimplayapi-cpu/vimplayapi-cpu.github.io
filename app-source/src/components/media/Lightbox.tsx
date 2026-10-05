'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { Frame } from './Frame';
import type { ImageAsset } from '@/lib/db/types';
import { cn } from '@/lib/cn';

/**
 * Full-screen image viewer.
 *
 * Accessibility: rendered as a modal dialog, focus is trapped inside while
 * open, Escape closes, arrow keys move between images, and focus returns to
 * the trigger on close. Touch users can swipe horizontally.
 */

export interface LightboxItem {
  image: ImageAsset;
  title?: string;
  caption?: string;
}

export function Lightbox({
  items,
  index,
  onClose,
  onIndexChange,
}: {
  items: LightboxItem[];
  index: number | null;
  onClose: () => void;
  onIndexChange: (next: number) => void;
}) {
  const open = index !== null;
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const go = useCallback(
    (delta: number) => {
      if (index === null || items.length === 0) return;
      // Wrap around so the gallery never dead-ends.
      onIndexChange((index + delta + items.length) % items.length);
    },
    [index, items.length, onIndexChange],
  );

  // Remember what had focus so it can be restored when the dialog closes.
  useEffect(() => {
    if (open) {
      restoreFocusRef.current = document.activeElement as HTMLElement | null;
      // Defer so the button exists before we move focus to it.
      const id = window.setTimeout(() => closeRef.current?.focus(), 0);
      return () => window.clearTimeout(id);
    }
    restoreFocusRef.current?.focus?.();
  }, [open]);

  // Lock background scroll, compensating for the scrollbar so nothing shifts.
  useEffect(() => {
    if (!open) return;
    const { body } = document;
    const prevOverflow = body.style.overflow;
    const prevPad = body.style.paddingRight;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = 'hidden';
    if (gap > 0) body.style.paddingRight = `${gap}px`;
    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPad;
    };
  }, [open]);

  // Keyboard: Escape, arrows, and a Tab trap.
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        go(1);
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        go(-1);
        return;
      }
      if (e.key !== 'Tab') return;

      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
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
  }, [open, go, onClose]);

  if (!open || index === null) return null;
  const item = items[index];
  if (!item) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={item.title ? `${item.title} — enlarged image` : 'Enlarged image'}
      className="on-photo fixed inset-0 z-[150] flex flex-col bg-black/97 backdrop-blur-sm"
      onTouchStart={(e) => {
        const t = e.touches[0];
        touchStart.current = { x: t.clientX, y: t.clientY };
      }}
      onTouchEnd={(e) => {
        const start = touchStart.current;
        if (!start) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - start.x;
        const dy = t.clientY - start.y;
        // Horizontal intent only, with a threshold that ignores taps.
        if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.6) go(dx < 0 ? 1 : -1);
        touchStart.current = null;
      }}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-hairline px-gutter py-4">
        <p className="tech-label tabular">
          {String(index + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
        </p>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="btn btn-ghost gap-3 text-chalk hover:text-signal"
        >
          CLOSE
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M1 1l12 12M13 1L1 13" />
          </svg>
        </button>
      </div>

      {/* Stage */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-gutter py-6">
        {items.length > 1 && (
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous image"
            className="absolute left-2 z-10 flex h-14 w-14 items-center justify-center text-mist transition-colors hover:text-signal sm:left-6"
          >
            <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.4">
              <path d="M16 4L7 13l9 9" />
            </svg>
          </button>
        )}

        <figure className="flex max-h-full max-w-[min(1500px,92vw)] flex-col items-center">
          <Frame
            image={item.image}
            sizes="92vw"
            priority
            className="max-h-[74vh] w-auto"
            imgClassName="max-h-[74vh] w-auto object-contain"
          />
          {(item.title || item.caption) && (
            <figcaption className="mt-5 max-w-prose text-center">
              {item.title && <p className="font-display text-sm font-semibold text-chalk">{item.title}</p>}
              {item.caption && <p className="mt-1 text-sm text-muted">{item.caption}</p>}
            </figcaption>
          )}
        </figure>

        {items.length > 1 && (
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next image"
            className="absolute right-2 z-10 flex h-14 w-14 items-center justify-center text-mist transition-colors hover:text-signal sm:right-6"
          >
            <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.4">
              <path d="M10 4l9 9-9 9" />
            </svg>
          </button>
        )}
      </div>

      {/* Live region so screen readers hear the position change */}
      <p className="sr-only" aria-live="polite">
        Image {index + 1} of {items.length}. {item.image.alt}
      </p>
    </div>
  );
}

/** Convenience hook for wiring a grid of thumbnails to the viewer. */
export function useLightbox() {
  const [index, setIndex] = useState<number | null>(null);
  return {
    index,
    open: (i: number) => setIndex(i),
    close: () => setIndex(null),
    setIndex,
  };
}
