import { ContentEditor, type ContentBlock } from '@/components/admin/ContentEditor';
import { PageHeader } from '@/components/admin/ui';
import { getDb } from '@/lib/db/client';
import { cn } from '@/lib/cn';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

/** Friendly names for the block groups. */
const PAGE_LABEL: Record<string, string> = {
  global: 'Global (header, footer, shared)',
  home: 'Home',
  about: 'About',
  services: 'Services',
  studios: 'Studios',
  gallery: 'Gallery',
  contact: 'Contact',
  demo: 'Demo request',
  legal: 'Legal — shared',
  privacy: 'Privacy policy',
  terms: 'Terms of use',
  cookies: 'Cookie policy',
};

export default async function PagesAdmin({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const db = getDb();

  const groups = db
    .prepare('SELECT page, COUNT(*) AS blocks FROM content_blocks GROUP BY page ORDER BY page')
    .all() as { page: string; blocks: number }[];

  const active = page && groups.some((g) => g.page === page) ? page : groups[0]?.page;

  const blocks = active
    ? (db
        .prepare(`
          SELECT id, page, block_key, value, value_type, label, hint
          FROM content_blocks WHERE page = ? ORDER BY sort_order, id
        `)
        .all(active) as ContentBlock[])
    : [];

  return (
    <>
      <PageHeader
        title="Page content"
        description="Every piece of copy on the public site. Changes go live immediately — no deploy required."
      />

      <nav aria-label="Content groups" className="mb-8 flex flex-wrap gap-2">
        {groups.map((g) => (
          <Link
            key={g.page}
            href={`/admin/pages?page=${g.page}`}
            className={cn(
              'border px-3.5 py-2 font-mono text-tech-sm uppercase transition-colors',
              g.page === active
                ? 'border-signal bg-signal/10 text-signal'
                : 'border-hairline text-mist hover:border-hairline-strong hover:text-chalk',
            )}
          >
            {PAGE_LABEL[g.page] ?? g.page}
            <span className="ml-2 opacity-60">{g.blocks}</span>
          </Link>
        ))}
      </nav>

      {active && <ContentEditor page={active} blocks={blocks} />}
    </>
  );
}
