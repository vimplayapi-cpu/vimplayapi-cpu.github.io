'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useAdmin } from './AdminShell';
import { Card, SaveStatus, type SaveState } from './ui';
import { Button } from '@/components/ui';

export interface SeoRow {
  id: number;
  route: string;
  title: string;
  description: string;
  canonical: string;
  robots: string;
  og_image_id: number | null;
}

/** Recommended lengths — over these, search engines commonly truncate. */
const TITLE_LIMIT = 60;
const DESCRIPTION_LIMIT = 160;

export function SeoEditor({ rows }: { rows: SeoRow[] }) {
  const { api, can } = useAdmin();
  const router = useRouter();
  const [values, setValues] = useState(rows);
  const [state, setState] = useState<SaveState>({ status: 'idle' });

  const canWrite = can('content.write');
  const dirty = JSON.stringify(values) !== JSON.stringify(rows);

  function update(route: string, patch: Partial<SeoRow>) {
    setValues((v) => v.map((r) => (r.route === route ? { ...r, ...patch } : r)));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setState({ status: 'saving' });

    const res = await api('/api/admin/seo', {
      method: 'PUT',
      body: JSON.stringify({
        records: values.map((r) => ({
          route: r.route,
          title: r.title,
          description: r.description,
          canonical: r.canonical,
          robots: r.robots,
          og_image_id: r.og_image_id,
        })),
      }),
    });
    const json = await res.json().catch(() => null);

    if (res.ok && json?.ok) {
      setState({ status: 'saved' });
      router.refresh();
    } else {
      setState({ status: 'error', message: json?.error?.message ?? 'Save failed' });
    }
  }

  return (
    <form onSubmit={save} className="space-y-6">
      {values.map((row) => {
        const titleOver = row.title.length > TITLE_LIMIT;
        const descOver = row.description.length > DESCRIPTION_LIMIT;

        return (
          <Card key={row.route}>
            <h2 className="mb-5 font-mono text-tech uppercase text-signal">{row.route}</h2>

            <div className="space-y-5">
              <div>
                <label htmlFor={`t-${row.id}`} className="field-label">
                  Title
                </label>
                <input
                  id={`t-${row.id}`}
                  type="text"
                  value={row.title}
                  disabled={!canWrite}
                  onChange={(e) => update(row.route, { title: e.target.value })}
                  className="field-input"
                />
                <p className={`mt-1.5 font-mono text-tech-sm ${titleOver ? 'text-standby' : 'text-muted'}`}>
                  {row.title.length} / {TITLE_LIMIT}
                  {titleOver && ' — may be truncated in search results'}
                </p>
              </div>

              <div>
                <label htmlFor={`d-${row.id}`} className="field-label">
                  Description
                </label>
                <textarea
                  id={`d-${row.id}`}
                  rows={2}
                  value={row.description}
                  disabled={!canWrite}
                  onChange={(e) => update(row.route, { description: e.target.value })}
                  className="field-input resize-y"
                />
                <p className={`mt-1.5 font-mono text-tech-sm ${descOver ? 'text-standby' : 'text-muted'}`}>
                  {row.description.length} / {DESCRIPTION_LIMIT}
                  {descOver && ' — may be truncated in search results'}
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor={`c-${row.id}`} className="field-label">
                    Canonical URL
                  </label>
                  <input
                    id={`c-${row.id}`}
                    type="url"
                    value={row.canonical}
                    disabled={!canWrite}
                    placeholder="Auto-generated when blank"
                    onChange={(e) => update(row.route, { canonical: e.target.value })}
                    className="field-input"
                  />
                </div>
                <div>
                  <label htmlFor={`r-${row.id}`} className="field-label">
                    Robots
                  </label>
                  <select
                    id={`r-${row.id}`}
                    value={row.robots}
                    disabled={!canWrite}
                    onChange={(e) => update(row.route, { robots: e.target.value })}
                    className="field-input"
                  >
                    {['index,follow', 'noindex,follow', 'index,nofollow', 'noindex,nofollow'].map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </Card>
        );
      })}

      <div className="flex items-center justify-between gap-6">
        <SaveStatus state={state} />
        <Button type="submit" disabled={!canWrite || !dirty || state.status === 'saving'}>
          {dirty ? 'SAVE SEO' : 'NO CHANGES'}
        </Button>
      </div>
    </form>
  );
}
