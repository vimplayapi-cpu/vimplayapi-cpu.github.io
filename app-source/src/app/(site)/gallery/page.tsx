import type { Metadata } from 'next';

import { Beacon } from '@/components/analytics/Beacon';
import { MasonryGallery } from '@/components/gallery/MasonryGallery';
import { CtaBand } from '@/components/layout/CtaBand';
import { Reveal } from '@/components/motion/Reveal';
import { SectionIntro } from '@/components/ui';
import {
  block, getBlocks, getGalleryCategories, getGalleryItems, getStudios,
} from '@/lib/db/queries';
import { buildMetadata } from '@/lib/seo';

/**
 * Rendered per request so content-management changes appear immediately.
 * All data comes from local SQLite, so this stays cheap.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildMetadata({ route: '/gallery' });

export default function GalleryPage() {
  const blocks = getBlocks('gallery');
  const items = getGalleryItems();
  const categories = getGalleryCategories();
  const studios = getStudios();

  return (
    <>
      <Beacon type="gallery_view" />

      <section className="border-b border-hairline pb-16 pt-40 sm:pt-48" aria-labelledby="gallery-heading">
        <div className="shell">
          <Reveal>
            <SectionIntro
              eyebrow={block(blocks, 'hero.eyebrow', 'Gallery')}
              headline={block(blocks, 'hero.headline', 'THE WORK,\nUP CLOSE.')}
              body={block(blocks, 'hero.body')}
              as="h1"
              className="max-w-4xl"
            />
          </Reveal>
        </div>
      </section>

      <section className="section" aria-label="Image gallery">
        <div className="shell">
          <MasonryGallery
            items={items}
            categories={categories}
            emptyTitle={block(blocks, 'empty.title', 'NO IMAGES IN THIS CATEGORY YET')}
            emptyBody={block(
              blocks,
              'empty.body',
              'Images are added and categorised from the media library in the back office.',
            )}
          />
        </div>
      </section>

      <CtaBand
        headline={"LET'S BUILD SOMETHING LIVE."}
        body="Every frame here is a working production environment. Tell us what you need to broadcast."
        ctaLabel="REQUEST A DEMO"
        image={studios.find((s) => s.slug === 'tokyo-nights')?.images.find((i) => i.role === 'wide') ?? null}
        secondary={{ label: 'VIEW STUDIOS', href: '/studios' }}
      />
    </>
  );
}
