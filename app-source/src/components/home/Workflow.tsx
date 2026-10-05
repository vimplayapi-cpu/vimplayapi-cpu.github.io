'use client';

import { Reveal } from '@/components/motion/Reveal';
import { SectionIntro } from '@/components/ui';
import { useGsapContext, usePrefersReducedMotion } from '@/lib/motion/useGsap';

export interface WorkflowStep {
  step: string;
  title: string;
  description: string;
}

/**
 * The six-stage delivery workflow, PLAN → OPERATE.
 *
 * Presented as a horizontal signal path: a technical line runs across the
 * stages and *draws* as the section is scrolled, with each node lighting up as
 * the line reaches it. The line is the point — it says these stages are one
 * continuous path, not six services on a shelf.
 *
 * Below the lg breakpoint the same data becomes a vertical rail, which reads
 * far better on a phone than a horizontally-scrolling strip.
 */
export function Workflow({
  eyebrow,
  headline,
  body,
  steps,
}: {
  eyebrow: string;
  headline: string;
  body: string;
  steps: WorkflowStep[];
}) {
  const reduced = usePrefersReducedMotion();

  const ref = useGsapContext<HTMLDivElement>(
    ({ gsap, root }) => {
      const line = root.querySelector('[data-flow-line]');
      const nodes = root.querySelectorAll('[data-flow-node]');
      const cards = root.querySelectorAll('[data-flow-card]');

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.querySelector('[data-flow-track]'),
          start: 'top 78%',
          end: 'bottom 72%',
          scrub: 0.6,
        },
      });

      // The connecting line draws left to right…
      tl.fromTo(line, { scaleX: 0 }, { scaleX: 1, ease: 'none' }, 0);

      // …and each node/card resolves as the line passes it.
      nodes.forEach((node, i) => {
        const at = i / Math.max(1, nodes.length - 1);
        tl.fromTo(
          node,
          { scale: 0.4, opacity: 0.25 },
          { scale: 1, opacity: 1, duration: 0.12, ease: 'power2.out' },
          Math.max(0, at * 0.86),
        );
        tl.fromTo(
          cards[i],
          { opacity: 0.18, y: 16 },
          { opacity: 1, y: 0, duration: 0.16, ease: 'power2.out' },
          Math.max(0, at * 0.86),
        );
      });
    },
    [steps.length],
    !reduced,
  );

  return (
    <section className="lux-workflow section relative" aria-label={eyebrow}>
      <div className="shell" ref={ref}>
        <Reveal>
          <SectionIntro
            eyebrow={eyebrow}
            headline={headline}
            body={body}
            as="h2"
            className="max-w-4xl"
          />
        </Reveal>

        {/* Desktop: horizontal signal path */}
        <div data-flow-track className="relative mt-20 hidden lg:block">
          {/* Rail */}
          <div className="absolute inset-x-0 top-[7px] h-px bg-hairline" aria-hidden />
          <div
            data-flow-line
            aria-hidden
            className="absolute inset-x-0 top-[7px] h-px origin-left bg-signal"
            style={{ transform: reduced ? 'scaleX(1)' : undefined }}
          />

          <ol className="relative grid grid-cols-6 gap-6">
            {steps.map((s) => (
              <li key={s.step} className="relative">
                <span
                  data-flow-node
                  aria-hidden
                  className="absolute left-0 top-0 block h-[15px] w-[15px] border border-signal bg-void"
                  style={{ opacity: reduced ? 1 : undefined }}
                />
                <div data-flow-card className="pt-12" style={{ opacity: reduced ? 1 : undefined }}>
                  <p className="tech-index text-signal">{s.step}</p>
                  <h3 className="mt-3 font-display text-lg font-semibold uppercase tracking-tight text-chalk">
                    {s.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{s.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Mobile / tablet: vertical rail */}
        <ol className="mt-14 lg:hidden">
          {steps.map((s, i) => (
            <li key={s.step} className="relative flex gap-6 pb-10 last:pb-0">
              {/* Connector between nodes */}
              {i < steps.length - 1 && (
                <span
                  aria-hidden
                  className="absolute left-[7px] top-4 h-full w-px bg-hairline"
                />
              )}
              <span
                aria-hidden
                className="relative z-10 mt-1 block h-[15px] w-[15px] shrink-0 border border-signal bg-void"
              />
              <Reveal delay={i * 70} className="flex-1">
                <p className="tech-index text-signal">{s.step}</p>
                <h3 className="mt-2 font-display text-lg font-semibold uppercase tracking-tight text-chalk">
                  {s.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-muted">{s.description}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
