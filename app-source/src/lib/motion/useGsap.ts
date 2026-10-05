'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * GSAP integration.
 *
 * Every timeline in the site is registered through these helpers so that
 * reduced-motion is honoured in one place: when the user prefers reduced
 * motion we never register a ScrollTrigger at all, rather than registering one
 * and animating to the same value. Elements are left in their final state by
 * the components themselves.
 */

/** useLayoutEffect on the client, useEffect during SSR (avoids the warning). */
export const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function usePrefersReducedMotion(): boolean {
  // Default to `true` so the very first paint is the safe, motionless one; the
  // effect relaxes it only if the user has not asked for reduced motion.
  const [reduced, setReduced] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

type GsapModule = typeof import('gsap');
type ScrollTriggerModule = typeof import('gsap/ScrollTrigger');

let loader: Promise<{ gsap: GsapModule['gsap']; ScrollTrigger: ScrollTriggerModule['ScrollTrigger'] }> | null =
  null;

/**
 * Loads GSAP and ScrollTrigger on demand and registers the plugin exactly once.
 * Keeping this dynamic keeps GSAP out of the initial bundle for pages that do
 * not scroll-animate anything.
 */
export function loadGsap() {
  if (!loader) {
    loader = Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(
      ([gsapMod, stMod]) => {
        const gsap = gsapMod.gsap ?? gsapMod.default;
        const ScrollTrigger = stMod.ScrollTrigger ?? stMod.default;
        gsap.registerPlugin(ScrollTrigger);
        return { gsap, ScrollTrigger };
      },
    );
  }
  return loader;
}

export interface GsapContextArgs {
  gsap: Awaited<ReturnType<typeof loadGsap>>['gsap'];
  ScrollTrigger: Awaited<ReturnType<typeof loadGsap>>['ScrollTrigger'];
  root: HTMLElement;
}

/**
 * Runs a GSAP setup function scoped to a ref, cleaning up on unmount via
 * gsap.context. The setup is skipped entirely under reduced motion.
 *
 * @param setup      Registers the animations. Return value is ignored.
 * @param deps       Re-runs the setup when these change.
 * @param enabled    Additional gate (e.g. skip on small screens).
 */
export function useGsapContext<T extends HTMLElement = HTMLDivElement>(
  setup: (args: GsapContextArgs) => void,
  deps: unknown[] = [],
  enabled = true,
) {
  const ref = useRef<T>(null);
  const reduced = usePrefersReducedMotion();

  useIsomorphicLayoutEffect(() => {
    if (reduced || !enabled || !ref.current) return;

    let ctx: { revert: () => void } | undefined;
    let cancelled = false;

    loadGsap().then(({ gsap, ScrollTrigger }) => {
      if (cancelled || !ref.current) return;
      ctx = gsap.context(() => setup({ gsap, ScrollTrigger, root: ref.current! }), ref.current);
    });

    return () => {
      cancelled = true;
      ctx?.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, enabled, ...deps]);

  return ref;
}

/**
 * Lightweight enter-reveal built on IntersectionObserver rather than GSAP.
 * Used for the many simple fade/rise reveals so they cost nothing extra.
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(
  options: { threshold?: number; rootMargin?: string; once?: boolean } = {},
) {
  const { threshold = 0.15, rootMargin = '0px 0px -10% 0px', once = true } = options;
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Without IntersectionObserver, show content immediately.
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) io.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { threshold, rootMargin },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [threshold, rootMargin, once]);

  return { ref, inView };
}

/** Tracks whether a media query currently matches. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(query);
    setMatches(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
