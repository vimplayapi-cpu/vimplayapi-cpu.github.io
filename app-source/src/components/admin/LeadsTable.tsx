'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useAdmin } from './AdminShell';
import { AdminTable, Badge, ConfirmButton, EmptyRow, SaveStatus, formatDate, type SaveState } from './ui';
import type { AdminLead } from '@/lib/admin/queries';
import { LEAD_STATUS_LABEL, type LeadStatus } from '@/lib/db/types';
import { cn } from '@/lib/cn';

const STATUS_TONE: Record<string, 'neutral' | 'ok' | 'warn' | 'bad' | 'accent'> = {
  new: 'accent',
  in_review: 'warn',
  contacted: 'ok',
  closed: 'neutral',
  spam: 'bad',
};

/**
 * Inquiry / demo-request table with an expandable detail row.
 *
 * Contact details are only ever rendered here, behind the admin guard. The
 * server strips the stored IP hash and user-agent before responding, so they
 * never reach the browser at all.
 */
export function LeadsTable({
  leads,
  type,
  activeStatus,
}: {
  leads: AdminLead[];
  type: 'inquiries' | 'demo-requests';
  activeStatus: string;
}) {
  const { api, can } = useAdmin();
  const router = useRouter();
  const [rows, setRows] = useState(leads);
  const [open, setOpen] = useState<number | null>(null);
  const [state, setState] = useState<SaveState>({ status: 'idle' });

  const canWrite = can('leads.write');
  const canDelete = can('leads.delete');

  async function update(id: number, status: string, notes: string) {
    setState({ status: 'saving' });
    const res = await api(`/api/admin/leads/${type}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, internal_notes: notes }),
    });
    if (res.ok) {
      setRows((r) => r.map((l) => (l.id === id ? { ...l, status, internalNotes: notes } : l)));
      setState({ status: 'saved' });
      router.refresh();
    } else {
      const json = await res.json().catch(() => null);
      setState({ status: 'error', message: json?.error?.message ?? 'Update failed' });
    }
  }

  async function remove(id: number) {
    setState({ status: 'saving' });
    const res = await api(`/api/admin/leads/${type}/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setRows((r) => r.filter((l) => l.id !== id));
      setState({ status: 'saved' });
      router.refresh();
    } else {
      const json = await res.json().catch(() => null);
      setState({ status: 'error', message: json?.error?.message ?? 'Delete failed' });
    }
  }

  const statuses: (LeadStatus | 'all')[] = ['all', 'new', 'in_review', 'contacted', 'closed', 'spam'];

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
          {statuses.map((s) => (
            <a
              key={s}
              href={`/admin/${type}?status=${s}`}
              className={cn(
                'border px-3 py-1.5 font-mono text-tech-sm uppercase transition-colors',
                activeStatus === s
                  ? 'border-signal bg-signal/10 text-signal'
                  : 'border-hairline text-mist hover:text-chalk',
              )}
            >
              {s === 'all' ? 'All' : LEAD_STATUS_LABEL[s as LeadStatus]}
            </a>
          ))}
        </nav>
        <SaveStatus state={state} />
      </div>

      <AdminTable head={['Received', 'Name', 'Company', 'Email', 'Status', '']}>
        {rows.length === 0 ? (
          <EmptyRow colSpan={6}>
            No records with this status.
          </EmptyRow>
        ) : (
          rows.map((lead) => (
            <LeadRow
              key={lead.id}
              lead={lead}
              expanded={open === lead.id}
              onToggle={() => setOpen(open === lead.id ? null : lead.id)}
              onUpdate={update}
              onDelete={remove}
              canWrite={canWrite}
              canDelete={canDelete}
            />
          ))
        )}
      </AdminTable>
    </>
  );
}

function LeadRow({
  lead,
  expanded,
  onToggle,
  onUpdate,
  onDelete,
  canWrite,
  canDelete,
}: {
  lead: AdminLead;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (id: number, status: string, notes: string) => void;
  onDelete: (id: number) => void;
  canWrite: boolean;
  canDelete: boolean;
}) {
  const [status, setStatus] = useState(lead.status);
  const [notes, setNotes] = useState(lead.internalNotes);

  return (
    <>
      <tr className="border-b border-hairline last:border-0">
        <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">{formatDate(lead.createdAt)}</td>
        <td className="px-4 py-3 text-sm text-chalk">{lead.name}</td>
        <td className="px-4 py-3 text-sm text-mist">{lead.company || '—'}</td>
        <td className="px-4 py-3">
          <a href={`mailto:${lead.email}`} className="link-draw text-sm text-mist">
            {lead.email}
          </a>
        </td>
        <td className="px-4 py-3">
          <Badge tone={STATUS_TONE[lead.status] ?? 'neutral'}>
            {LEAD_STATUS_LABEL[lead.status as keyof typeof LEAD_STATUS_LABEL] ?? lead.status}
          </Badge>
        </td>
        <td className="px-4 py-3 text-right">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            className="font-mono text-tech-sm uppercase text-mist hover:text-chalk"
          >
            {expanded ? 'Hide' : 'Open'}
          </button>
        </td>
      </tr>

      {expanded && (
        <tr className="border-b border-hairline bg-void/40">
          <td colSpan={6} className="px-4 py-6">
            <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
              <div>
                <h3 className="tech-label mb-4">Submission</h3>
                <dl className="space-y-3">
                  {lead.phone && (
                    <div className="flex gap-4">
                      <dt className="w-40 shrink-0 font-mono text-tech-sm uppercase text-muted">Phone</dt>
                      <dd className="text-sm text-mist">
                        <a href={`tel:${lead.phone}`} className="link-draw">{lead.phone}</a>
                      </dd>
                    </div>
                  )}
                  {lead.country && (
                    <div className="flex gap-4">
                      <dt className="w-40 shrink-0 font-mono text-tech-sm uppercase text-muted">Country</dt>
                      <dd className="text-sm text-mist">{lead.country}</dd>
                    </div>
                  )}
                  {Object.entries(lead.detail)
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <div key={k} className="flex gap-4">
                        <dt className="w-40 shrink-0 font-mono text-tech-sm uppercase text-muted">{k}</dt>
                        <dd className="whitespace-pre-wrap text-sm text-mist">{v}</dd>
                      </div>
                    ))}
                </dl>
              </div>

              <div>
                <h3 className="tech-label mb-4">Handling</h3>
                <label className="field-label" htmlFor={`status-${lead.id}`}>
                  Status
                </label>
                <select
                  id={`status-${lead.id}`}
                  value={status}
                  disabled={!canWrite}
                  onChange={(e) => setStatus(e.target.value)}
                  className="field-input mb-4"
                >
                  {Object.entries(LEAD_STATUS_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>

                <label className="field-label" htmlFor={`notes-${lead.id}`}>
                  Internal notes
                </label>
                <textarea
                  id={`notes-${lead.id}`}
                  rows={4}
                  value={notes}
                  disabled={!canWrite}
                  onChange={(e) => setNotes(e.target.value)}
                  className="field-input resize-y"
                  placeholder="Not visible to the sender."
                />

                <div className="mt-4 flex items-center justify-between gap-4">
                  <button
                    type="button"
                    disabled={!canWrite}
                    onClick={() => onUpdate(lead.id, status, notes)}
                    className="btn btn-secondary py-2.5"
                  >
                    SAVE
                  </button>
                  {canDelete && (
                    <ConfirmButton
                      label="Delete record"
                      confirmLabel="Delete permanently?"
                      onConfirm={() => onDelete(lead.id)}
                    />
                  )}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
