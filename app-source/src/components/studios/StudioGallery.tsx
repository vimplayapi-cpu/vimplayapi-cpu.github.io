'use client';

import { Frame } from '@/components/media/Frame';
import { Lightbox, useLightbox } from '@/components/media/Lightbox';
import { Reveal } from '@/components/motion/Reveal';
import { Index } from '@/components/ui';
import type { StudioImage } from '@/lib/db/types';

/**
 * The four reference frames for a studio.
 *
 * Desktop gets an asymmetric editorial layout — the wide environment shot runs
 * large, the three supporting angles sit beneath it — so the set reads as a
 * place rather than as four equal thumbnails. On small screens it becomes a
 * horizontal snap-scroll strip, which is a far better way to compare angles on
 * a phone than a stack of full-width images.
 */
export function StudioGallery({
  images,
  studioName,
  accent,
}: {
  images: StudioImage[];
  studioName: string;
  accent: string;
}) {
  const lightbox = useLightbox();

  if (images.length === 0) return null;

  const items = images.map((img) => ({
    image: img,
    title: `${studioName} — ${img.roleLabel}`,
    caption: img.caption,
  }));

  const [lead, ...rest] = images;

  return (
    <>
      {/* Mobile: swipeable strip */}
      <div className="-mx-gutter lg:hidden">
        <ul
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-gutter pb-4"
          style={{ scrollbarWidth: 'none' }}
        >
          {images.map((img, i) => (
            <li key={img.id ?? i} className="w-[82vw] shrink-0 snap-center">
              <button
                type="button"
                onClick={() => lightbox.open(i)}
                className="group block w-full text-left"
                aria-label={`Open image ${i + 1}: ${img.roleLabel}`}
              >
                <span className="panel frame-ticks relative block aspect-[4/3] overflow-hidden">
                  <Frame
                    image={img}
                    sizes="82vw"
                    alt={img.alt}
                    className="absolute inset-0 h-full w-full"
                  />
                </span>
                <span className="mt-3 flex items-center justify-between gap-3">
                  <Index value={img.position} total={images.length} />
                  <span className="font-mono text-tech-sm uppercase text-mist">{img.roleLabel}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Desktop: editorial composition */}
      <div className="hidden lg:block">
        <Reveal>
          <GalleryTile
            image={lead}
            index={0}
            total={images.length}
            aspect="aspect-[21/9]"
            sizes="(max-width: 1536px) 92vw, 1400px"
            accent={accent}
            onOpen={lightbox.open}
            priority
          />
        </Reveal>

        <div className="mt-6 grid grid-cols-3 gap-6">
          {rest.map((img, i) => (
            <Reveal key={img.id ?? i} delay={i * 90}>
              <GalleryTile
                image={img}
                index={i + 1}
                total={images.length}
                aspect="aspect-[4/3]"
                sizes="30vw"
                accent={accent}
                onOpen={lightbox.open}
              />
            </Reveal>
          ))}
        </div>
      </div>

      <Lightbox
        items={items}
        index={lightbox.index}
        onClose={lightbox.close}
        onIndexChange={lightbox.setIndex}
      />
    </>
  );
}

function GalleryTile({
  image,
  index,
  total,
  aspect,
  sizes,
  accent,
  onOpen,
  priority = false,
}: {
  image: StudioImage;
  index: number;
  total: number;
  aspect: string;
  sizes: string;
  accent: string;
  onOpen: (i: number) => void;
  priority?: boolean;
}) {
  return (
    <figure>
      <button
        type="button"
        onClick={() => onOpen(index)}
        className="group block w-full text-left"
        aria-label={`Enlarge image ${image.position}: ${image.roleLabel}`}
      >
        <span className={`panel frame-ticks relative block overflow-hidden ${aspect}`}>
          <Frame
            image={image}
            sizes={sizes}
            priority={priority}
            alt={image.alt}
            className="absolute inset-0 h-full w-full"
            imgClassName="h-full w-full object-cover transition-transform duration-[1600ms] ease-cinematic group-hover:scale-[1.045]"
          />
          {/* Enlarge affordance */}
          <span
            aria-hidden
            className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center border opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            style={{ borderColor: accent, backgroundColor: `${accent}22` }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke={accent} strokeWidth="1.4">
              <path d="M5 1H1v4M8 12h4V8M1 8v4h4M12 5V1H8" />
            </svg>
          </span>
        </span>
      </button>
      <figcaption className="mt-3 flex items-center justify-between gap-4 border-t border-hairline pt-3">
        <Index value={image.position} total={total} />
        <span className="font-mono text-tech-sm uppercase text-mist">{image.roleLabel}</span>
      </figcaption>
    </figure>
  );
}
