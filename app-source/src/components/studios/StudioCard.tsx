import Link from '@/components/ui/SiteLink';

import { Frame } from '@/components/media/Frame';
import { Arrow, Index, StatusPill } from '@/components/ui';
import type { Studio } from '@/lib/db/types';
import { cn } from '@/lib/cn';

/**
 * Studio card.
 *
 * Each card is themed with its own environment's accent, taken from the set
 * lighting, so a grid of ten reads as ten distinct rooms rather than ten
 * instances of one template. The cover frame is the overhead camera-array shot,
 * which is the most immediately legible "this is a broadcast studio" image in
 * each set.
 */
export function StudioCard({
  studio,
  index,
  total,
  className,
  priority = false,
  sizes = "(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 31vw",
}: {
  studio: Studio;
  index: number;
  total?: number;
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  // Prefer the overhead technical frame as the cover; fall back to the wide.
  const cover =
    studio.images.find((i) => i.role === 'tech') ?? studio.images.find((i) => i.role === 'wide') ?? studio.images[0];

  return (
    <article
      className={cn('group relative', className)}
      style={{ ['--studio-accent' as string]: studio.accent }}
    >
      <Link href={`/studios/${studio.slug}`} className="block focus-visible:outline-offset-4">
        <div className="on-photo panel frame-ticks relative aspect-[4/3] overflow-hidden">
          {cover ? (
            <>
              <Frame
                image={cover}
                sizes={sizes}
                priority={priority}
                alt={cover.alt}
                className="absolute inset-0 h-full w-full"
                imgClassName="h-full w-full object-cover transition-transform duration-[1400ms] ease-cinematic group-hover:scale-[1.06]"
              />
              <span
                aria-hidden
                className="absolute inset-0 transition-opacity duration-700"
                style={{
                  background: `linear-gradient(to top, rgba(5,7,10,0.92) 0%, rgba(5,7,10,0.25) 45%, transparent 75%),
                               linear-gradient(to bottom right, ${studio.accent}1F, transparent 55%)`,
                }}
              />
            </>
          ) : (
            <div className="absolute inset-0 bg-graphite" />
          )}

          {/* Code + status rail */}
          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
            <span className="font-mono text-tech uppercase text-chalk/90">{studio.code}</span>
            <StatusPill status={studio.status} label={studio.statusLabel} />
          </div>

          {/* Name plate */}
          <div className="absolute inset-x-0 bottom-0 p-5">
            <h3 className="font-display text-2xl font-semibold uppercase leading-none tracking-tight text-chalk">
              {studio.name}
            </h3>
            {studio.tagline && (
              <p className="mt-2 font-mono text-tech-sm uppercase text-mist/85">{studio.tagline}</p>
            )}
          </div>

          {/* Accent underline that draws on hover */}
          <span
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 transition-transform duration-700 ease-cinematic group-hover:scale-x-100"
            style={{ backgroundColor: studio.accent }}
          />
        </div>

        <div className="mt-4 flex items-center justify-between gap-4">
          <Index value={index} total={total} />
          <span className="flex items-center gap-2.5 font-mono text-tech uppercase text-mist transition-colors duration-500 group-hover:text-[color:var(--studio-accent)]">
            VIEW STUDIO
            <Arrow />
          </span>
        </div>
      </Link>
    </article>
  );
}
