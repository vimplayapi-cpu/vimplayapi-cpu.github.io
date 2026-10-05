'use client';
import Link from '@/components/ui/SiteLink';
import { LiveSignal } from '@/components/brand/Wordmark';
import { StudioSequence } from './StudioSequence';
import { Arrow } from '@/components/ui';
import type { ImageAsset } from '@/lib/db/types';
import { useGsapContext, useMediaQuery, usePrefersReducedMotion } from '@/lib/motion/useGsap';

export function Hero({ image, eyebrow, headline, body, primaryCta, secondaryCta, signalLines }: {
  image: ImageAsset | null; eyebrow: string; headline: string; body: string;
  primaryCta: string; secondaryCta: string; signalLines: string[]; accent: string;
}) {
  const reduced = usePrefersReducedMotion();
  const desktop = useMediaQuery('(min-width: 1024px) and (pointer: fine)');
  const ref = useGsapContext<HTMLDivElement>(({ gsap, root }) => {
    gsap.fromTo(root.querySelectorAll('[data-hero-enter]'),
      { y: 22, opacity: .5 }, { y: 0, opacity: 1, stagger: .09, duration: .9, ease: 'power3.out' });
    gsap.to(root.querySelector('[data-brand-seal]'), { y: -35, rotate: 6, ease: 'none',
      scrollTrigger: { trigger: root, start: 'top top', end: 'bottom top', scrub: 1 } });
  }, [], desktop && !reduced);

  return (
    <section ref={ref} className="brand-hero" aria-labelledby="hero-heading">
      <div className="shell hero-intro">
        <div className="hero-copy">
          <p data-hero-enter className="hero-eyebrow">{eyebrow}</p>
          <h1 data-hero-enter id="hero-heading" className="hero-title">
            {headline.split('\n').map((line, i) => <span className={i ? 'hero-serif' : ''} key={i}>{line.charAt(0) + line.slice(1).toLowerCase()}</span>)}
          </h1>
          <p data-hero-enter className="hero-description">{body}</p>
          <div data-hero-enter className="hero-actions">
            <Link href="/demo" className="btn btn-primary group">{primaryCta}<Arrow /></Link>
            <Link href="/studios" className="btn btn-secondary group">{secondaryCta}<Arrow /></Link>
          </div>
        </div>
        <div className="hero-seal-wrap" data-brand-seal>
          <img className={`hero-seal ${!reduced ? 'seal-animated' : ''}`} src={`${process.env.NEXT_PUBLIC_LM_BASE_PATH ?? ''}/brand/live-miracle-gold.png`} width="2017" height="2048" alt="Live Miracle gold logo" />
          <span className="seal-line" aria-hidden />
          <LiveSignal lines={signalLines} />
        </div>
      </div>
      <StudioSequence image={image} />
      <div className="shell hero-details">
        <div><span>CAM 01 · WIDE</span><h2>Every position planned.</h2><p>Camera coverage, lighting and the technical path are designed together — not bolted on once the set is built.</p></div>
        <div><span>SIGNAL PATH · ACTIVE</span><h2>From the floor to the viewer.</h2><p>Encoding, delivery, monitoring and redundancy, planned as one continuous path.</p></div>
        <div><span>LIVE MIRACLE</span><h2>Ready when you go live.</h2><Link href="/demo" className="link-draw">{primaryCta} →</Link></div>
      </div>
    </section>
  );
}
