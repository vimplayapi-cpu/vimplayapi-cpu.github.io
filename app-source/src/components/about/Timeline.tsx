'use client';

import { Frame } from '@/components/media/Frame';
import { EmptyState, Index, isPlaceholder } from '@/components/ui';
import type { TimelineEvent } from '@/lib/db/types';
import { useGsapContext, usePrefersReducedMotion } from '@/lib/motion/useGsap';
import { cn } from '@/lib/cn';

/**
 * Company timeline.
 *
 * Animation sequence per the brief: the rail draws as you scroll, then each
 * year appears, its image reveals, and the description fades in.
 *
 * Entries are seeded as bracketed placeholders because company history is not
 * invented — when every entry is still a placeholder the component says so
 * plainly rather than presenting empty brackets as if they were content.
 */
export function Timeline({ events }: { events: TimelineEvent[] }) {
  const reduced = usePrefersReducedMotion();

  const ref = useGsapContext<HTMLDivElement>(
    ({ gsap, root }) => {
      const rail = root.querySelector('[data-timeline-rail]');

      gsap.fromTo(
        rail,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: 'none',
          scrollTrigger: { trigger: root, start: 'top 70%', end: 'bottom 80%', scrub: 0.5 },
        },
      );

      root.querySelectorAll('[data-timeline-entry]').forEach((entry) => {
        const tl = gsap.timeline({
          scrollTrigger: { trigger: entry, start: 'top 80%', once: true },
          defaults: { ease: 'power3.out' },
        });
        tl.fromTo(entry.querySelector('[data-timeline-year]'), { opacity: 0, x: -18 }, { opacity: 1, x: 0, duration: 0.6 })
          .fromTo(
            entry.querySelector('[data-timeline-media]'),
            { clipPath: 'inset(0 0 100% 0)' },
            { clipPath: 'inset(0 0 0% 0)', duration: 0.9 },
            0.15,
          )
          .fromTo(
            entry.querySelector('[data-timeline-body]'),
            { opacity: 0, y: 14 },
            { opacity: 1, y: 0, duration: 0.7 },
            0.35,
          );
      });
    },
    [events.length],
    !reduced,
  );

  const allPlaceholder =
    events.length > 0 && events.every((e) => isPlaceholder(e.year) && isPlaceholder(e.event));

  if (events.length === 0 || allPlaceholder) {
    return (
      <EmptyState
        title="TIMELINE NOT YET PUBLISHED"
        body="Company milestones are added, ordered and edited by the administrator in the back office. No history is shown until real milestones are supplied."
      />
    );
  }

  return (
    <div ref={ref} className="relative">
      {/* Rail */}
      <div aria-hidden className="absolute bottom-0 left-[7px] top-2 w-px bg-hairline sm:left-[calc(8rem+7px)]" />
      <div
        data-timeline-rail
        aria-hidden
        className="absolute bottom-0 left-[7px] top-2 w-px origin-top bg-signal sm:left-[calc(8rem+7px)]"
        style={reduced ? { transform: 'scaleY(1)' } : undefined}
      />

      <ol className="space-y-16">
        {events.map((event, i) => (
          <li key={event.id} data-timeline-entry className="relative">
            <div className="grid gap-6 sm:grid-cols-[8rem_1fr] sm:gap-10">
              {/* Year */}
              <div data-timeline-year className="sm:text-right" style={reduced ? { opacity: 1 } : undefined}>
                <p
                  className={cn(
                    'font-display text-2xl font-semibold uppercase tracking-tight sm:text-3xl',
                    isPlaceholder(event.year) ? 'text-standby/70' : 'text-chalk',
                  )}
                >
                  {isPlaceholder(event.year) ? event.year.replace(/^\[|\]$/g, '') : event.year}
                </p>
                <Index value={i + 1} total={events.length} className="mt-2 block" />
              </div>

              {/* Node + content */}
              <div className="relative pl-8 sm:pl-10">
                <span
                  aria-hidden
                  className="absolute left-0 top-2 block h-[15px] w-[15px] border border-signal bg-void sm:-left-[7px]"
                />

                <h3
                  className={cn(
                    'font-display text-xl font-semibold uppercase tracking-tight',
                    isPlaceholder(event.event) ? 'text-standby/70' : 'text-chalk',
                  )}
                >
                  {isPlaceholder(event.event) ? event.event.replace(/^\[|\]$/g, '') : event.event}
                </h3>

                {event.image && (
                  <div
                    data-timeline-media
                    className="panel frame-ticks relative mt-5 aspect-[16/9] max-w-xl overflow-hidden"
                    style={reduced ? { clipPath: 'inset(0)' } : undefined}
                  >
                    <Frame
                      image={event.image}
                      sizes="(max-width: 640px) 92vw, 36rem"
                      alt={event.image.alt}
                      className="absolute inset-0 h-full w-full"
                    />
                  </div>
                )}

                <p
                  data-timeline-body
                  className={cn(
                    'mt-4 max-w-prose text-sm leading-relaxed',
                    isPlaceholder(event.description) ? 'text-standby/60' : 'text-mist',
                  )}
                  style={reduced ? { opacity: 1 } : undefined}
                >
                  {isPlaceholder(event.description)
                    ? event.description.replace(/^\[|\]$/g, '')
                    : event.description}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
