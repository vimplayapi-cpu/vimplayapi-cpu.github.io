'use client';

import { useMemo, useState } from 'react';

import { Frame } from '@/components/media/Frame';
import { Lightbox, useLightbox } from '@/components/media/Lightbox';
import { EmptyState } from '@/components/ui';
import type { GalleryCategory, GalleryItem } from '@/lib/db/types';
import { cn } from '@/lib/cn';

/**
 * Cinematic masonry gallery.
 *
 * Uses CSS multi-column for the masonry flow — it keeps the natural aspect
 * ratio of every frame without any JS measurement, so there is no layout
 * thrash on resize and it degrades perfectly with JS disabled.
 *
 * Filtering is client-side over an already-loaded set: the whole gallery is a
 * few dozen items, so a round-trip per filter would be slower and worse.
 */
export function MasonryGallery({
  items,
  categories,
  emptyTitle,
  emptyBody,
}: {
  items: GalleryItem[];
  categories: GalleryCategory[];
  emptyTitle: string;
  emptyBody: string;
}) {
  const [filter, setFilter] = useState<string>('all');
  const lightbox = useLightbox();

  const visible = useMemo(
    () => (filter === 'all' ? items : items.filter((i) => i.categorySlug === filter)),
    [items, filter],
  );

  // Only offer filters that would actually return something.
  const usable = categories.filter((c) => c.count > 0);

  const lightboxItems = visible.map((i) => ({
    image: i.image,
    title: i.title,
    caption: i.caption,
  }));

  return (
    <>
      {/* Filters */}
      {usable.length > 0 && (
        <div className="mb-12 flex flex-wrap gap-x-2 gap-y-3" role="group" aria-label="Filter gallery by category">
          <FilterChip
            label="All"
            count={items.length}
            active={filter === 'all'}
            onClick={() => setFilter('all')}
          />
          {usable.map((c) => (
            <FilterChip
              key={c.slug}
              label={c.name}
              count={c.count}
              active={filter === c.slug}
              onClick={() => setFilter(c.slug)}
            />
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyState title={emptyTitle} body={emptyBody} />
      ) : (
        <>
          <p className="sr-only" aria-live="polite">
            Showing {visible.length} {visible.length === 1 ? 'image' : 'images'}
            {filter !== 'all' && ` in ${usable.find((c) => c.slug === filter)?.name ?? filter}`}.
          </p>

          <ul className="columns-1 gap-5 sm:columns-2 lg:columns-3 [&>li]:mb-5">
            {visible.map((item, i) => (
              <li key={item.id} className="break-inside-avoid">
                <button
                  type="button"
                  onClick={() => lightbox.open(i)}
                  className="group relative block w-full overflow-hidden text-left"
                  aria-label={`Enlarge: ${item.title || item.image.alt}`}
                >
                  <span className="panel frame-ticks relative block overflow-hidden">
                    <Frame
                      image={item.image}
                      sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 31vw"
                      alt={item.image.alt}
                      // Eager-load the first screenful; lazy-load the rest.
                      priority={i < 3}
                      imgClassName="w-full transition-transform duration-[1400ms] ease-cinematic group-hover:scale-[1.05]"
                    />

                    {/* Hover preview overlay */}
                    <span
                      aria-hidden
                      className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-void via-void/25 to-transparent p-5 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                    >
                      {item.title && (
                        <span className="font-display text-base font-semibold uppercase tracking-tight text-chalk">
                          {item.title}
                        </span>
                      )}
                      {item.caption && (
                        <span className="mt-1 font-mono text-tech-sm uppercase text-mist">
                          {item.caption}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <Lightbox
        items={lightboxItems}
        index={lightbox.index}
        onClose={lightbox.close}
        onIndexChange={lightbox.setIndex}
      />
    </>
  );
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-2.5 border px-4 py-2.5 font-mono text-tech uppercase transition-all duration-400 ease-cinematic',
        active
          ? 'border-signal bg-signal/10 text-signal'
          : 'border-hairline text-mist hover:border-hairline-strong hover:text-chalk',
      )}
    >
      {label}
      <span className="tabular text-tech-sm opacity-60">{count}</span>
    </button>
  );
}
