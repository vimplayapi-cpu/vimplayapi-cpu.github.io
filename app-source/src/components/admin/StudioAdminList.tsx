'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useAdmin } from './AdminShell';
import { AdminTable, Badge, ConfirmButton, EmptyRow, SaveStatus, formatDate, type SaveState } from './ui';
import type { AdminStudioRow } from '@/lib/admin/queries';

/**
 * Studio index with inline publish toggling, reordering and delete.
 *
 * Reordering is done with explicit up/down controls rather than drag-and-drop:
 * it is keyboard-operable, works on touch without a gesture library, and the
 * order it produces is unambiguous.
 */
export function StudioAdminList({
  studios,
  locations,
}: {
  studios: AdminStudioRow[];
  locations: { id: number; country: string }[];
}) {
  const { api, can } = useAdmin();
  const router = useRouter();
  const [rows, setRows] = useState(studios);
  const [state, setState] = useState<SaveState>({ status: 'idle' });

  const canWrite = can('content.write');
  const canDelete = can('content.delete');

  async function persistOrder(next: AdminStudioRow[]) {
    setRows(next);
    setState({ status: 'saving' });
    const res = await api('/api/admin/studios', {
      method: 'PATCH',
      body: JSON.stringify({ ids: next.map((r) => r.id) }),
    });
    if (res.ok) {
      setState({ status: 'saved' });
      router.refresh();
    } else {
      const json = await res.json().catch(() => null);
      setState({ status: 'error', message: json?.error?.message ?? 'Could not save order' });
    }
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    void persistOrder(next);
  }

  async function remove(id: number) {
    setState({ status: 'saving' });
    const res = await api(`/api/admin/studios/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setRows((r) => r.filter((s) => s.id !== id));
      setState({ status: 'saved' });
      router.refresh();
    } else {
      const json = await res.json().catch(() => null);
      setState({ status: 'error', message: json?.error?.message ?? 'Delete failed' });
    }
  }

  const locationName = (id: number | null) =>
    id === null ? null : locations.find((l) => l.id === id)?.country ?? null;

  return (
    <>
      <div className="mb-4">
        <SaveStatus state={state} />
      </div>

      <AdminTable head={['Order', 'Studio', 'Location', 'Status', 'Media', 'Published', 'Updated', '']}>
        {rows.length === 0 ? (
          <EmptyRow colSpan={8}>
            No studios yet. Create the first one to get started.
          </EmptyRow>
        ) : (
          rows.map((s, i) => (
            <tr key={s.id} className="border-b border-hairline last:border-0">
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0 || !canWrite}
                    aria-label={`Move ${s.name} up`}
                    className="px-1.5 py-0.5 font-mono text-tech-sm text-mist hover:text-chalk disabled:opacity-25"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === rows.length - 1 || !canWrite}
                    aria-label={`Move ${s.name} down`}
                    className="px-1.5 py-0.5 font-mono text-tech-sm text-mist hover:text-chalk disabled:opacity-25"
                  >
                    ↓
                  </button>
                </div>
              </td>

              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className="block h-6 w-1 shrink-0"
                    style={{ backgroundColor: s.accent }}
                  />
                  <div className="min-w-0">
                    <Link href={`/admin/studios/${s.id}`} className="link-draw block text-sm text-chalk">
                      {s.name}
                    </Link>
                    <span className="font-mono text-tech-sm uppercase text-muted">
                      {s.code} · /{s.slug}
                    </span>
                  </div>
                </div>
              </td>

              <td className="px-4 py-3 text-sm text-mist">
                {locationName(s.locationId) ?? <span className="text-standby/70">Unassigned</span>}
              </td>

              <td className="px-4 py-3">
                <Badge tone={s.status === 'available' ? 'ok' : s.status === 'unavailable' ? 'neutral' : 'warn'}>
                  {s.status.replace('_', ' ')}
                </Badge>
              </td>

              <td className="px-4 py-3">
                <span className="font-mono text-tech-sm uppercase tabular text-mist">
                  {s.imageCount}/4 img
                </span>
                <span
                  className={`ml-2 font-mono text-tech-sm uppercase ${s.hasVideo ? 'text-ready' : 'text-muted'}`}
                >
                  {s.hasVideo ? 'video' : 'no video'}
                </span>
              </td>

              <td className="px-4 py-3">
                <Badge tone={s.isPublished ? 'ok' : 'neutral'}>{s.isPublished ? 'Live' : 'Draft'}</Badge>
              </td>

              <td className="px-4 py-3 text-xs text-muted">{formatDate(s.updatedAt)}</td>

              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-4">
                  <Link
                    href={`/admin/studios/${s.id}`}
                    className="font-mono text-tech-sm uppercase text-mist hover:text-chalk"
                  >
                    Edit
                  </Link>
                  {canDelete && (
                    <ConfirmButton label="Delete" confirmLabel="Delete?" onConfirm={() => remove(s.id)} />
                  )}
                </div>
              </td>
            </tr>
          ))
        )}
      </AdminTable>
    </>
  );
}
