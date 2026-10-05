import type { Metadata } from 'next';

import { LegalDocument } from '@/components/legal/LegalDocument';
import { block, getBlocks } from '@/lib/db/queries';
import { buildMetadata } from '@/lib/seo';

/**
 * Rendered per request so content-management changes appear immediately.
 * All data comes from local SQLite, so this stays cheap.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildMetadata({ route: '/terms' });

export default function TermsPage() {
  const doc = getBlocks('terms');
  const legal = getBlocks('legal');
  const showNotice = block(legal, 'review.visible', 'true') === 'true';

  return (
    <LegalDocument
      title={block(doc, 'hero.headline', 'TERMS OF USE')}
      body={block(doc, 'body')}
      reviewNotice={showNotice ? block(legal, 'review.note') : undefined}
    />
  );
}
