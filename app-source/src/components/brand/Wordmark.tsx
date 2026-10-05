'use client';
import { cn } from '@/lib/cn';
import { usePrefersReducedMotion } from '@/lib/motion/useGsap';

/** The supplied transparent artwork, framed to its central wordmark for navigation. */
export function Wordmark({ className, animate = true }: {
  className?: string; animate?: boolean; showRule?: boolean;
}) {
  const reduced = usePrefersReducedMotion();
  return (
    <span className={cn('brand-wordmark', animate && !reduced && 'brand-animated', className)}>
      <svg viewBox="390 945 1240 165" role="img" aria-label="Live Miracle" className="brand-art">
        <image href={`${process.env.NEXT_PUBLIC_LM_BASE_PATH ?? ''}/brand/live-miracle-gold.png`} width="2017" height="2048" />
      </svg>
    </span>
  );
}

/**
 * Small live-signal readout used in the hero and the header.
 *
 * The pulsing dot is the one continuously animated element on the site: it
 * represents an active broadcast, so continuous motion is meaningful here.
 */
export function LiveSignal({
  lines = ['LIVE', 'SIGNAL', 'ACTIVE'],
  className,
  orientation = 'horizontal',
}: {
  lines?: string[];
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}) {
  const reduced = usePrefersReducedMotion();

  return (
    <div
      className={cn(
        'flex items-center gap-3',
        orientation === 'vertical' && 'flex-col items-start gap-2',
        className,
      )}
    >
      <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
        <span
          className={cn(
            'absolute inline-flex h-full w-full rounded-full bg-live',
            !reduced && 'animate-signal-pulse',
          )}
        />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-live" />
      </span>
      <span
        className={cn(
          'flex gap-2.5 font-mono text-tech-sm uppercase text-mist',
          orientation === 'vertical' && 'flex-col gap-1',
        )}
      >
        {lines.map((line, i) => (
          <span key={i} className={i === 0 ? 'text-chalk' : undefined}>
            {line}
          </span>
        ))}
      </span>
    </div>
  );
}
