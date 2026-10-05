import Link from '@/components/ui/SiteLink';

import { Frame } from '@/components/media/Frame';
import { Reveal } from '@/components/motion/Reveal';
import { Arrow, Headline } from '@/components/ui';
import type { ImageAsset } from '@/lib/db/types';

/**
 * Closing call-to-action band, used at the foot of the home page and every
 * service and studio detail page. Sits over a darkened studio frame so the
 * page ends on the product rather than on a flat colour panel.
 */
export function CtaBand({
  headline,
  body,
  ctaLabel,
  href = '/demo',
  image,
  accent,
  secondary,
}: {
  headline: string;
  body?: string;
  ctaLabel: string;
  href?: string;
  image?: ImageAsset | null;
  accent?: string;
  secondary?: { label: string; href: string };
}) {
  return (
    <section
      className="brand-cta on-photo relative isolate overflow-hidden border-t border-hairline"
      style={accent ? { ['--studio-accent' as string]: accent } : undefined}
      aria-labelledby="cta-heading"
    >
      {image && (
        <>
          <Frame
            image={image}
            sizes="100vw"
            alt=""
            className="absolute inset-0 -z-10 h-full w-full"
            imgClassName="h-full w-full object-cover"
          />
          <div
            aria-hidden
            className="absolute inset-0 -z-10"
            style={{
              background: accent
                ? `linear-gradient(to right, rgba(5,7,10,0.96) 30%, rgba(5,7,10,0.72) 100%), linear-gradient(to bottom right, ${accent}18, transparent 70%)`
                : 'linear-gradient(to right, rgba(5,7,10,0.96) 30%, rgba(5,7,10,0.74) 100%)',
            }}
          />
          <div aria-hidden className="absolute inset-0 -z-10 grain" />
        </>
      )}

      <div className="shell py-24 sm:py-28 lg:py-32">
        <Reveal>
          <div className="max-w-4xl">
            <Headline as="h2" size="md" className="text-chalk">
              {headline}
            </Headline>
            {body && <p className="mt-6 max-w-prose text-base leading-relaxed text-mist sm:text-lg">{body}</p>}

            <div className="mt-10 flex flex-wrap gap-4">
              <Link href={href} className="btn btn-primary group">
                {ctaLabel}
                <Arrow />
              </Link>
              {secondary && (
                <Link href={secondary.href} className="btn btn-secondary group">
                  {secondary.label}
                  <Arrow />
                </Link>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
