'use client';

import { type ElementType, type ReactNode } from 'react';

import { useInView } from '@/lib/motion/useGsap';
import { cn } from '@/lib/cn';

/**
 * Reveal primitives.
 *
 * Each of these communicates something specific rather than decorating:
 *  - `Reveal` rises content into place as it enters, establishing reading order.
 *  - `MaskReveal` wipes a panel back like a camera shutter opening.
 *  - `Stagger` sequences a list so the eye follows the order it should read in.
 *
 * All of them collapse to "already visible, no transition" under reduced
 * motion, which the global stylesheet enforces via transition-duration.
 */

type Direction = 'up' | 'down' | 'left' | 'right' | 'none';

const OFFSET: Record<Direction, string> = {
  up: 'translate3d(0,1.75rem,0)',
  down: 'translate3d(0,-1.75rem,0)',
  left: 'translate3d(1.75rem,0,0)',
  right: 'translate3d(-1.75rem,0,0)',
  none: 'none',
};

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Direction the content travels from. */
  from?: Direction;
  delay?: number;
  duration?: number;
  as?: ElementType;
  threshold?: number;
}

export function Reveal({
  children,
  className,
  from = 'up',
  delay = 0,
  duration = 900,
  as: Tag = 'div',
  threshold = 0.15,
}: RevealProps) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold });

  return (
    <Tag
      ref={ref}
      // `lm-reveal` is the hook the no-JS stylesheet uses to force this content
      // visible. Without it, the server-rendered opacity:0 would be permanent
      // for anyone whose JavaScript never runs.
      className={cn('lm-reveal will-change-[opacity,transform]', className)}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'none' : OFFSET[from],
        transition: `opacity ${duration}ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform ${duration}ms cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      {children}
    </Tag>
  );
}

/**
 * Wipes content into view from one edge, like a shutter opening. Used for
 * photography and full-bleed panels where a fade would look weak.
 */
export function MaskReveal({
  children,
  className,
  delay = 0,
  duration = 1200,
  direction = 'up',
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
}) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.2 });

  const hidden: Record<typeof direction, string> = {
    up: 'inset(100% 0 0 0)',
    down: 'inset(0 0 100% 0)',
    left: 'inset(0 0 0 100%)',
    right: 'inset(0 100% 0 0)',
  };

  return (
    <div
      ref={ref}
      className={cn('lm-mask gpu', className)}
      style={{
        clipPath: inView ? 'inset(0 0 0 0)' : hidden[direction],
        transition: `clip-path ${duration}ms cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Sequences children with a fixed interval. Each child is wrapped so the
 * caller does not have to thread delays through manually.
 */
export function Stagger({
  children,
  className,
  interval = 90,
  from = 'up',
  initialDelay = 0,
  as: Tag = 'div',
  childClassName,
}: {
  children: ReactNode[];
  className?: string;
  interval?: number;
  from?: Direction;
  initialDelay?: number;
  as?: ElementType;
  childClassName?: string;
}) {
  return (
    <Tag className={className}>
      {children.map((child, i) => (
        <Reveal key={i} from={from} delay={initialDelay + i * interval} className={childClassName}>
          {child}
        </Reveal>
      ))}
    </Tag>
  );
}
