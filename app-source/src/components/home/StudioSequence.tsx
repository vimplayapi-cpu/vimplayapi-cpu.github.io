'use client';

import { useEffect, useRef } from 'react';
import { Frame } from '@/components/media/Frame';
import type { ImageAsset } from '@/lib/db/types';
import { loadGsap, usePrefersReducedMotion } from '@/lib/motion/useGsap';

/** Original studio frames, scrubbed by native scroll. Poster remains until a frame is ready. */
export function StudioSequence({ image }: { image: ImageAsset | null }) {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduced = usePrefersReducedMotion();
  useEffect(() => {
    if (reduced || !root.current || !canvas.current) return;
    const el = root.current;
    const surface = canvas.current;
    const ctx = surface.getContext('2d');
    if (!ctx) return;
    let disposed = false;
    let cleanup: (() => void) | undefined;
    const frames: HTMLImageElement[] = [];
    const playhead = { frame: 0 };
    const size = window.innerWidth < 768 ? 960 : 1920;
    let last = -1;
    const draw = () => {
      if (disposed) return;
      const target = Math.round(playhead.frame);
      let index = target;
      if (!frames[index]?.naturalWidth) {
        index = frames.findIndex((f) => f?.naturalWidth > 0);
        for (let i = 0; i < frames.length; i++) {
          if (frames[i]?.naturalWidth && Math.abs(i - target) < Math.abs(index - target)) index = i;
        }
      }
      const frame = frames[index];
      if (!frame?.naturalWidth || index === last) return;
      ctx.drawImage(frame, 0, 0, surface.width, surface.height);
      surface.style.opacity = '1';
      surface.dataset.frame = String(index + 1);
      last = index;
    };
    surface.width = size;
    surface.height = size * 9 / 16;
    let cursor = 0;
    // A coarse pass gives fast-scroll users a complete sequence before filling the gaps.
    const order = [...Array.from({ length: 24 }, (_, i) => i * 4), ...Array.from({ length: 96 }, (_, i) => i).filter(i => i % 4 !== 0)];
    const load = () => {
      if (disposed || cursor >= order.length) return;
      const index = order[cursor++];
      const img = new Image();
      frames[index] = img;
      img.decoding = 'async';
      img.onload = () => { draw(); load(); };
      img.onerror = () => load();
      img.src = `${process.env.NEXT_PUBLIC_LM_BASE_PATH ?? ''}/frames/neon-noir/${size}/frame_${String(index + 1).padStart(4, '0')}.webp`;
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      for (let i = 0; i < 4; i++) load();
    }, { rootMargin: '600px' });
    observer.observe(el);
    loadGsap().then(({ gsap }) => {
      if (disposed) return;
      const context = gsap.context(() => {
        gsap.to(playhead, { frame: 95, ease: 'none', onUpdate: draw,
          scrollTrigger: { trigger: el, start: 'top top', end: 'bottom bottom', scrub: .65, invalidateOnRefresh: true } });
        gsap.to(el.querySelector('.sequence-progress-fill'), { scaleX: 1, ease: 'none',
          scrollTrigger: { trigger: el, start: 'top top', end: 'bottom bottom', scrub: .65 } });
      }, el);
      cleanup = () => context.revert();
    });
    return () => { disposed = true; observer.disconnect(); cleanup?.(); frames.forEach(f => { f.onload = null; f.onerror = null; }); };
  }, [reduced]);
  return <div ref={root} className={`studio-sequence ${reduced ? 'sequence-static' : ''}`}>
    <div className="sequence-sticky on-photo">
      {image && <Frame image={image} priority sizes="100vw" className="sequence-poster" imgClassName="h-full w-full object-cover" />}
      <canvas ref={canvas} className="sequence-canvas" aria-hidden="true" />
      <div className="sequence-shade" aria-hidden="true" />
      <div className="sequence-caption"><span className="sequence-kicker">INSIDE THE STUDIO</span><h2>Every angle.<br /><em>One seamless production.</em></h2><p>Camera coverage, lighting and the technical path — designed together.</p></div>
      <div className="sequence-bottom"><span>NEON NOIR · STUDIO WALKTHROUGH</span><a href="#studio-environments">EXPLORE STUDIOS <span aria-hidden>↗</span></a></div>
      <div className="sequence-progress" aria-hidden><div className="sequence-progress-fill" /></div>
    </div>
  </div>;
}
