'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useAdmin } from './AdminShell';
import { MediaPicker } from './MediaPicker';
import { Badge, Card, ConfirmButton, SaveStatus, type SaveState } from './ui';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';

/**
 * Generic editor for the simpler ordered CMS collections — services,
 * locations, timeline entries and gallery items.
 *
 * A field-definition list drives the form, which keeps four admin screens
 * consistent with each other and means a new collection needs a config rather
 * than a new component.
 */

export type FieldType =
  | 'text' | 'textarea' | 'number' | 'checkbox'
  | 'select' | 'list' | 'pairs' | 'media' | 'colour';

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  hint?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  /** Rows for textarea. */
  rows?: number;
  /** For 'media': restricts the picker. */
  mediaKind?: 'image' | 'video';
  /** Hidden from the create form (e.g. computed fields). */
  hideOnCreate?: boolean;
}

export type Row = Record<string, unknown>;

export function CollectionEditor({
  endpoint,
  rows: initialRows,
  fields,
  titleKey,
  subtitleKey,
  emptyLabel,
  canReorder = true,
}: {
  endpoint: string;
  rows: Row[];
  fields: FieldDef[];
  titleKey: string;
  subtitleKey?: string;
  emptyLabel: string;
  canReorder?: boolean;
}) {
  const { api, can } = useAdmin();
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [editing, setEditing] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);
  const [state, setState] = useState<SaveState>({ status: 'idle' });

  const canWrite = can('content.write');
  const canDelete = can('content.delete');

  async function persistOrder(next: Row[]) {
    setRows(next);
    const res = await api(endpoint, {
      method: 'PATCH',
      body: JSON.stringify({ ids: next.map((r) => Number(r.id)) }),
    });
    setState(res.ok ? { status: 'saved' } : { status: 'error', message: 'Could not save order' });
    if (res.ok) router.refresh();
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    void persistOrder(next);
  }

  async function remove(id: number) {
    const res = await api(`${endpoint}/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setRows((r) => r.filter((x) => Number(x.id) !== id));
      setState({ status: 'saved' });
      router.refresh();
    } else {
      const json = await res.json().catch(() => null);
      setState({ status: 'error', message: json?.error?.message ?? 'Delete failed' });
    }
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <SaveStatus state={state} />
        {canWrite && (
          <Button type="button" onClick={() => setCreating(true)} className="py-2.5">
            NEW ENTRY
          </Button>
        )}
      </div>

      {rows.length === 0 ? (
        <Card>
          <p className="py-8 text-center text-sm text-muted">{emptyLabel}</p>
        </Card>
      ) : (
        <ul className="border border-hairline">
          {rows.map((row, i) => (
            <li
              key={String(row.id)}
              className="flex flex-wrap items-center gap-4 border-b border-hairline px-4 py-3 last:border-0"
            >
              {canReorder && (
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0 || !canWrite}
                    aria-label="Move up"
                    className="px-1.5 font-mono text-tech-sm text-mist hover:text-chalk disabled:opacity-25"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === rows.length - 1 || !canWrite}
                    aria-label="Move down"
                    className="px-1.5 font-mono text-tech-sm text-mist hover:text-chalk disabled:opacity-25"
                  >
                    ↓
                  </button>
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-chalk">
                  {String(row[titleKey] ?? '') || <span className="text-standby/70">Untitled</span>}
                </p>
                {subtitleKey && (
                  <p className="truncate font-mono text-tech-sm uppercase text-muted">
                    {String(row[subtitleKey] ?? '')}
                  </p>
                )}
              </div>

              {'is_published' in row && (
                <Badge tone={Number(row.is_published) === 1 ? 'ok' : 'neutral'}>
                  {Number(row.is_published) === 1 ? 'Live' : 'Draft'}
                </Badge>
              )}

              <div className="flex shrink-0 items-center gap-4">
                <button
                  type="button"
                  onClick={() => setEditing(row)}
                  className="font-mono text-tech-sm uppercase text-mist hover:text-chalk"
                >
                  Edit
                </button>
                {canDelete && (
                  <ConfirmButton
                    label="Delete"
                    confirmLabel="Delete?"
                    onConfirm={() => remove(Number(row.id))}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {(editing || creating) && (
        <RowForm
          endpoint={endpoint}
          fields={fields}
          row={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSaved={() => {
            setEditing(null);
            setCreating(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function RowForm({
  endpoint,
  fields,
  row,
  onClose,
  onSaved,
}: {
  endpoint: string;
  fields: FieldDef[];
  row: Row | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { api, can } = useAdmin();
  const isNew = row === null;

  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {};
    for (const f of fields) {
      const raw = row?.[f.key];
      switch (f.type) {
        case 'checkbox':
          initial[f.key] = raw === undefined ? true : Number(raw) === 1 || raw === true;
          break;
        case 'list':
          initial[f.key] = Array.isArray(raw) ? raw : safeParseArray(raw);
          break;
        case 'pairs':
          initial[f.key] = Array.isArray(raw) ? raw : safeParseArray(raw);
          break;
        case 'number':
          initial[f.key] = raw ?? 0;
          break;
        case 'media':
          initial[f.key] = raw ?? null;
          break;
        default:
          initial[f.key] = raw ?? '';
      }
    }
    return initial;
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<SaveState>({ status: 'idle' });
  const [picking, setPicking] = useState<FieldDef | null>(null);

  const canPublish = can('content.publish');

  const set = (key: string, value: unknown) => setValues((v) => ({ ...v, [key]: value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState({ status: 'saving' });
    setErrors({});

    const res = await api(isNew ? endpoint : `${endpoint}/${row!.id}`, {
      method: isNew ? 'POST' : 'PUT',
      body: JSON.stringify(values),
    });
    const json = await res.json().catch(() => null);

    if (res.ok && json?.ok) {
      setState({ status: 'saved' });
      onSaved();
      return;
    }
    setErrors((json?.error?.details as Record<string, string>) ?? {});
    setState({ status: 'error', message: json?.error?.message ?? 'Save failed' });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isNew ? 'New entry' : 'Edit entry'}
      className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-void/95 p-6 backdrop-blur-sm"
    >
      <form onSubmit={submit} className="w-full max-w-3xl border border-hairline bg-midnight">
        <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
          <h2 className="font-mono text-tech uppercase text-chalk">{isNew ? 'New entry' : 'Edit entry'}</h2>
          <button type="button" onClick={onClose} className="font-mono text-tech uppercase text-mist">
            CLOSE
          </button>
        </div>

        <div className="space-y-6 p-6">
          {fields
            .filter((f) => !(isNew && f.hideOnCreate))
            .map((field) => {
              const id = `field-${field.key}`;
              const error = errors[field.key];

              return (
                <div key={field.key}>
                  {field.type !== 'checkbox' && (
                    <label htmlFor={id} className="field-label">
                      {field.label}
                      {field.required && <span className="ml-1 text-signal">*</span>}
                    </label>
                  )}

                  {field.type === 'textarea' && (
                    <textarea
                      id={id}
                      rows={field.rows ?? 4}
                      value={String(values[field.key] ?? '')}
                      onChange={(e) => set(field.key, e.target.value)}
                      className="field-input resize-y"
                    />
                  )}

                  {(field.type === 'text' || field.type === 'number') && (
                    <input
                      id={id}
                      type={field.type === 'number' ? 'number' : 'text'}
                      step={field.type === 'number' ? 'any' : undefined}
                      value={String(values[field.key] ?? '')}
                      onChange={(e) =>
                        set(field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)
                      }
                      className="field-input"
                    />
                  )}

                  {field.type === 'colour' && (
                    <div className="flex gap-3">
                      <input
                        type="color"
                        value={String(values[field.key] ?? '#3DDCE8')}
                        onChange={(e) => set(field.key, e.target.value)}
                        className="h-12 w-16 shrink-0 cursor-pointer border border-hairline bg-midnight"
                        aria-label={`${field.label} picker`}
                      />
                      <input
                        id={id}
                        type="text"
                        value={String(values[field.key] ?? '')}
                        onChange={(e) => set(field.key, e.target.value)}
                        className="field-input font-mono"
                      />
                    </div>
                  )}

                  {field.type === 'select' && (
                    <select
                      id={id}
                      value={String(values[field.key] ?? '')}
                      onChange={(e) => set(field.key, e.target.value === '' ? null : e.target.value)}
                      className="field-input"
                    >
                      <option value="">—</option>
                      {field.options?.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  )}

                  {field.type === 'checkbox' && (
                    <label className="flex cursor-pointer items-center gap-3">
                      <input
                        id={id}
                        type="checkbox"
                        checked={Boolean(values[field.key])}
                        disabled={field.key === 'is_published' && !canPublish}
                        onChange={(e) => set(field.key, e.target.checked)}
                        className="h-4 w-4 accent-[#3DDCE8]"
                      />
                      <span className="font-mono text-tech uppercase text-chalk">
                        {field.label}
                        {field.key === 'is_published' && !canPublish && (
                          <span className="ml-2 text-muted">(requires publish permission)</span>
                        )}
                      </span>
                    </label>
                  )}

                  {field.type === 'list' && (
                    <ArrayInput
                      values={(values[field.key] as string[]) ?? []}
                      onChange={(next) => set(field.key, next)}
                      label={field.label}
                    />
                  )}

                  {field.type === 'pairs' && (
                    <PairsInput
                      values={(values[field.key] as { title: string; description: string }[]) ?? []}
                      onChange={(next) => set(field.key, next)}
                    />
                  )}

                  {field.type === 'media' && (
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-tech-sm uppercase text-mist">
                        {values[field.key] ? `Media #${values[field.key]}` : 'None selected'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPicking(field)}
                        className="font-mono text-tech-sm uppercase text-signal"
                      >
                        Choose
                      </button>
                      {values[field.key] != null && (
                        <button
                          type="button"
                          onClick={() => set(field.key, null)}
                          className="font-mono text-tech-sm uppercase text-muted hover:text-live"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  )}

                  {field.hint && <p className="mt-2 text-xs text-muted">{field.hint}</p>}
                  {error && <p className="field-error">{error}</p>}
                </div>
              );
            })}
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-hairline px-6 py-4">
          <SaveStatus state={state} />
          <Button type="submit" disabled={state.status === 'saving'}>
            {isNew ? 'CREATE' : 'SAVE'}
          </Button>
        </div>
      </form>

      {picking && (
        <MediaPicker
          kind={picking.mediaKind ?? 'image'}
          onClose={() => setPicking(null)}
          onSelect={(item) => {
            set(picking.key, item.id);
            setPicking(null);
          }}
        />
      )}
    </div>
  );
}

function safeParseArray(raw: unknown): unknown[] {
  if (typeof raw !== 'string') return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function ArrayInput({
  values,
  onChange,
  label,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  label: string;
}) {
  return (
    <div>
      <div className="space-y-2">
        {values.map((v, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="text"
              value={v}
              onChange={(e) => {
                const next = [...values];
                next[i] = e.target.value;
                onChange(next);
              }}
              className="field-input"
              aria-label={`${label} ${i + 1}`}
            />
            <button
              type="button"
              onClick={() => onChange(values.filter((_, idx) => idx !== i))}
              aria-label={`Remove ${label} ${i + 1}`}
              className="shrink-0 px-3 font-mono text-tech-sm text-muted hover:text-live"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...values, ''])}
        className="mt-2 font-mono text-tech-sm uppercase text-signal"
      >
        + Add
      </button>
    </div>
  );
}

function PairsInput({
  values,
  onChange,
}: {
  values: { title: string; description: string }[];
  onChange: (next: { title: string; description: string }[]) => void;
}) {
  return (
    <div>
      <div className="space-y-3">
        {values.map((row, i) => (
          <div key={i} className="border border-hairline p-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={row.title}
                placeholder="Title"
                onChange={(e) => {
                  const next = [...values];
                  next[i] = { ...next[i], title: e.target.value };
                  onChange(next);
                }}
                className="field-input"
                aria-label={`Item ${i + 1} title`}
              />
              <button
                type="button"
                onClick={() => onChange(values.filter((_, idx) => idx !== i))}
                aria-label={`Remove item ${i + 1}`}
                className="shrink-0 px-3 font-mono text-tech-sm text-muted hover:text-live"
              >
                ✕
              </button>
            </div>
            <textarea
              rows={2}
              value={row.description}
              placeholder="Description"
              onChange={(e) => {
                const next = [...values];
                next[i] = { ...next[i], description: e.target.value };
                onChange(next);
              }}
              className="field-input mt-2 resize-y"
              aria-label={`Item ${i + 1} description`}
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...values, { title: '', description: '' }])}
        className="mt-2 font-mono text-tech-sm uppercase text-signal"
      >
        + Add item
      </button>
    </div>
  );
}
