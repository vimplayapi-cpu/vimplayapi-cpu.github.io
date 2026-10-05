import { redirect } from 'next/navigation';

import { AdminTable, Card, EmptyRow, PageHeader, formatDate } from '@/components/admin/ui';
import { countAudit, readAudit } from '@/lib/audit';
import { pageSession } from '@/lib/auth/guard';

export const dynamic = 'force-dynamic';

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  // Page-level permission check; the data helpers are server-only.
  const session = await pageSession('audit.read');
  if (!session) redirect('/admin');

  const { page } = await searchParams;
  const pageNum = Math.max(1, Number(page ?? 1) || 1);
  const perPage = 60;
  const entries = readAudit(perPage, (pageNum - 1) * perPage);
  const total = countAudit();
  const pages = Math.max(1, Math.ceil(total / perPage));

  return (
    <>
      <PageHeader
        title="Audit log"
        description={`${total.toLocaleString()} recorded actions. Append-only; sensitive values are redacted before writing.`}
      />

      <AdminTable head={['When', 'Actor', 'Action', 'Entity', 'Detail']}>
        {entries.length === 0 ? (
          <EmptyRow colSpan={5}>No audit entries yet.</EmptyRow>
        ) : (
          entries.map((e) => (
            <tr key={e.id} className="border-b border-hairline last:border-0 align-top">
              <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">{formatDate(e.createdAt)}</td>
              <td className="px-4 py-3 text-sm text-mist">{e.actorEmail ?? 'system'}</td>
              <td className="px-4 py-3">
                <span className="font-mono text-tech-sm uppercase text-chalk">{e.action}</span>
              </td>
              <td className="px-4 py-3 text-xs text-muted">
                {e.entity ?? '—'}
                {e.entityId ? ` #${e.entityId}` : ''}
              </td>
              <td className="max-w-md px-4 py-3">
                <code className="block truncate font-mono text-xs text-muted">{e.meta}</code>
              </td>
            </tr>
          ))
        )}
      </AdminTable>

      {pages > 1 && (
        <nav aria-label="Audit pagination" className="mt-6 flex items-center gap-4">
          {pageNum > 1 && (
            <a href={`/admin/audit?page=${pageNum - 1}`} className="link-draw font-mono text-tech uppercase text-mist">
              ← Newer
            </a>
          )}
          <span className="font-mono text-tech-sm uppercase text-muted">
            Page {pageNum} of {pages}
          </span>
          {pageNum < pages && (
            <a href={`/admin/audit?page=${pageNum + 1}`} className="link-draw font-mono text-tech uppercase text-mist">
              Older →
            </a>
          )}
        </nav>
      )}
    </>
  );
}
