import type { ImageAsset } from '@/lib/db/types';
import { cn } from '@/lib/cn';

/**
 * Renders a studio photograph.
 *
 * Uses a plain <picture> rather than next/image because the derivatives are
 * pre-generated at build time with known dimensions and srcsets — there is no
 * runtime optimisation left to do, and this avoids a second image pipeline.
 *
 * The LQIP is painted as a blurred background behind the real image so there
 * is never a blank box, and width/height are always set so the layout never
 * shifts as images arrive.
 */
export function Frame({
  image,
  sizes = '100vw',
  className,
  imgClassName,
  priority = false,
  /** Overrides alt text; pass '' only for genuinely decorative imagery. */
  alt,
}: {
  image: ImageAsset;
  sizes?: string;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
  alt?: string;
}) {
  const resolvedAlt = alt !== undefined ? alt : image.alt;

  return (
    <picture className={cn('block', className)}>
      {image.avifSrcSet && <source type="image/avif" srcSet={image.avifSrcSet} sizes={sizes} />}
      {image.webpSrcSet && <source type="image/webp" srcSet={image.webpSrcSet} sizes={sizes} />}
      <img
        src={image.webp || image.avif}
        alt={resolvedAlt}
        width={image.width}
        height={image.height}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        // fetchPriority nudges the hero image ahead of everything else.
        fetchPriority={priority ? 'high' : 'auto'}
        className={cn('h-full w-full object-cover', imgClassName)}
        style={
          image.lqip
            ? {
                backgroundImage: `url("${image.lqip}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : { backgroundColor: image.dominant }
        }
      />
    </picture>
  );
}

/**
 * Photograph seated into the page ground: vignette, subtle grain and an
 * optional accent-tinted scrim so a set's own colour bleeds into the layout.
 */
export function CineFrame({
  image,
  sizes,
  className,
  imgClassName,
  priority,
  accent,
  scrim = true,
  alt,
  children,
}: {
  image: ImageAsset;
  sizes?: string;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
  accent?: string;
  scrim?: boolean;
  alt?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn('on-photo relative overflow-hidden grain', className)}>
      <Frame
        image={image}
        sizes={sizes}
        priority={priority}
        alt={alt}
        className="absolute inset-0 h-full w-full"
        imgClassName={imgClassName}
      />
      {scrim && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: accent
              ? `radial-gradient(130% 100% at 50% 30%, transparent 30%, rgba(5,7,10,0.62) 100%),
                 linear-gradient(to top, rgba(5,7,10,0.94) 0%, rgba(5,7,10,0.15) 55%, transparent 100%),
                 linear-gradient(to bottom right, ${accent}14, transparent 60%)`
              : `radial-gradient(130% 100% at 50% 30%, transparent 30%, rgba(5,7,10,0.62) 100%),
                 linear-gradient(to top, rgba(5,7,10,0.94) 0%, rgba(5,7,10,0.15) 55%, transparent 100%)`,
          }}
        />
      )}
      {children}
    </div>
  );
}
