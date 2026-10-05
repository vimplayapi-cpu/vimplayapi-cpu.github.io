'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useAdmin } from './AdminShell';
import { Badge, Card, ConfirmButton, SaveStatus, formatBytes, formatDate, type SaveState } from './ui';
import { cn } from '@/lib/cn';

interface MediaItem {
  id: number;
  kind: string;
  storageKey: string;
  originalName: string;
  mime: string;
  bytes: number;
  width: number | null;
  height: number | null;
  alt: string;
  caption: string;
  thumb: string | null;
  isManaged: boolean;
  createdAt: number;
}

/**
 * Full media library: upload, search, filter, preview, edit metadata, delete.
 *
 * Derivatives (AVIF + WebP at three widths) and the blur placeholder are
 * generated server-side on upload, so nothing here needs to know about image
 * processing.
 */
export function MediaLibrary() {
  const { api, can } = useAdmin();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [total, setTotal] = useState(0);
  const [kind, setKind] = useState('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [state, setState] = useState<SaveState>({ status: 'idle' });
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const canWrite = can('media.write');
  const canDelete = can('media.delete');

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ kind, limit: '120' });
    if (query) params.set('q', query);
    const res = await api(`/api/admin/media?${params}`);
    const json = await res.json().catch(() => null);
    if (json?.ok) {
      setItems(json.data.items);
      setTotal(json.data.total);
    }
    setLoading(false);
  }, [api, kind, query]);

  useEffect(() => {
    void load();
  }, [load]);

  async function upload(files: FileList | File[]) {
    setState({ status: 'saving' });
    let failures = 0;

    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append('file', file);
      const res = await api('/api/admin/media', { method: 'POST', body: form });
      if (!res.ok) {
        failures += 1;
        const json = await res.json().catch(() => null);
        setState({ status: 'error', message: json?.error?.message ?? `Failed: ${file.name}` });
      }
    }

    if (failures === 0) setState({ status: 'saved' });
    await load();
  }

  async function saveMeta(item: MediaItem, alt: string, caption: string) {
    setState({ status: 'saving' });
    const res = await api(`/api/admin/media/${item.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ alt, caption }),
    });
    if (res.ok) {
      setState({ status: 'saved' });
      setItems((list) => list.map((i) => (i.id === item.id ? { ...i, alt, caption } : i)));
      setSelected((s) => (s && s.id === item.id ? { ...s, alt, caption } : s));
    } else {
      const json = await res.json().catch(() => null);
      setState({ status: 'error', message: json?.error?.message ?? 'Save failed' });
    }
  }

  async function remove(item: MediaItem) {
    setState({ status: 'saving' });
    const res = await api(`/api/admin/media/${item.id}`, { method: 'DELETE' });
    const json = await res.json().catch(() => null);
    if (res.ok) {
      setState({ status: 'saved' });
      setSelected(null);
      await load();
    } else {
      setState({ status: 'error', message: json?.error?.message ?? 'Delete failed' });
    }
  }

  return (
    <>
      {/* Toolbar */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="flex gap-2">
          {['all', 'image', 'video'].map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              aria-pressed={kind === k}
              className={cn(
                'border px-3 py-1.5 font-mono text-tech-sm uppercase transition-colors',
                kind === k
                  ? 'border-signal bg-signal/10 text-signal'
                  : 'border-hairline text-mist hover:text-chalk',
              )}
            >
              {k}
            </button>
          ))}
        </div>

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, alt or caption"
          aria-label="Search media"
          className="field-input w-full max-w-xs py-2"
        />

        {canWrite && (
          <>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/*,video/mp4,video/webm,video/quicktime"
              className="sr-only"
              onChange={(e) => {
                if (e.target.files?.length) void upload(e.target.files);
                e.target.value = '';
              }}
            />
            <button type="button" onClick={() => fileRef.current?.click()} className="btn btn-primary py-2.5">
              UPLOAD
            </button>
          </>
        )}

        <span className="ml-auto font-mono text-tech-sm uppercase tabular text-muted">
          {total} item{total === 1 ? '' : 's'}
        </span>
        <SaveStatus state={state} />
      </div>

      {/* Drop zone */}
      {canWrite && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files?.length) void upload(e.dataTransfer.files);
          }}
          className={cn(
            'mb-6 border border-dashed px-6 py-8 text-center transition-colors',
            dragOver ? 'border-signal bg-signal/5' : 'border-hairline',
          )}
        >
          <p className="font-mono text-tech uppercase text-muted">
            Drop files here to upload — images up to 25MB, video up to 200MB
          </p>
          <p className="mt-2 text-xs text-muted">
            Images are converted to AVIF and WebP at three widths automatically.
          </p>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <p className="font-mono text-tech uppercase text-muted">Loading…</p>
      ) : items.length === 0 ? (
        <Card>
          <p className="py-8 text-center text-sm text-muted">
            No media found. {canWrite ? 'Upload something to get started.' : ''}
          </p>
        </Card>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setSelected(item)}
                className="group block w-full border border-hairline text-left transition-colors hover:border-signal"
              >
                <span className="relative block aspect-[4/3] overflow-hidden bg-midnight">
                  {item.thumb && item.kind === 'image' ? (
                    // eslint-disable-next-line @next/next/no-img-element -- admin preview only
                    <img src={item.thumb} alt="" loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full items-center justify-center font-mono text-tech-sm uppercase text-muted">
                      {item.kind}
                    </span>
                  )}
                  {item.isManaged && (
                    <span className="absolute right-2 top-2">
                      <Badge tone="neutral">BUILD</Badge>
                    </span>
                  )}
                  {!item.alt && item.kind === 'image' && (
                    <span className="absolute left-2 top-2">
                      <Badge tone="warn">NO ALT</Badge>
                    </span>
                  )}
                </span>
                <span className="block p-3">
                  <span className="block truncate text-xs text-chalk">{item.originalName}</span>
                  <span className="mt-1 block font-mono text-tech-sm uppercase text-muted">
                    {formatBytes(item.bytes)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Detail drawer */}
      {selected && (
        <MediaDetail
          item={selected}
          canWrite={canWrite}
          canDelete={canDelete}
          onClose={() => setSelected(null)}
          onSave={(alt, caption) => saveMeta(selected, alt, caption)}
          onDelete={() => remove(selected)}
        />
      )}
    </>
  );
}

function MediaDetail({
  item,
  canWrite,
  canDelete,
  onClose,
  onSave,
  onDelete,
}: {
  item: MediaItem;
  canWrite: boolean;
  canDelete: boolean;
  onClose: () => void;
  onSave: (alt: string, caption: string) => void;
  onDelete: () => void;
}) {
  const [alt, setAlt] = useState(item.alt);
  const [caption, setCaption] = useState(item.caption);

  useEffect(() => {
    setAlt(item.alt);
    setCaption(item.caption);
  }, [item]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Media detail: ${item.originalName}`}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-void/95 p-6 backdrop-blur-sm"
    >
      <div className="max-h-full w-full max-w-4xl overflow-y-auto border border-hairline bg-midnight">
        <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
          <h2 className="truncate font-mono text-tech uppercase text-chalk">{item.originalName}</h2>
          <button type="button" onClick={onClose} className="font-mono text-tech uppercase text-mist">
            CLOSE
          </button>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-2">
          <div>
            <div className="border border-hairline bg-void">
              {item.kind === 'image' && item.thumb ? (
                // eslint-disable-next-line @next/next/no-img-element -- admin preview only
                <img src={item.thumb} alt={item.alt} className="h-auto w-full" />
              ) : item.kind === 'video' ? (
                // eslint-disable-next-line jsx-a11y/media-has-caption -- admin preview only
                <video src={`/uploads/${item.storageKey}`} controls className="h-auto w-full" />
              ) : null}
            </div>

            <dl className="mt-4 space-y-2 text-xs">
              {[
                ['Type', item.mime],
                ['Size', formatBytes(item.bytes)],
                ['Dimensions', item.width && item.height ? `${item.width} × ${item.height}` : '—'],
                ['Uploaded', formatDate(item.createdAt)],
                ['Storage key', item.storageKey],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="font-mono uppercase text-muted">{k}</dt>
                  <dd className="truncate text-mist">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div>
            <label htmlFor="media-alt" className="field-label">
              Alt text
            </label>
            <textarea
              id="media-alt"
              rows={3}
              value={alt}
              disabled={!canWrite}
              onChange={(e) => setAlt(e.target.value)}
              className="field-input resize-y"
              placeholder="Describe the image for screen readers and search engines."
            />
            <p className="mt-2 text-xs text-muted">
              Required for every meaningful image. Leave empty only for purely decorative assets.
            </p>

            <label htmlFor="media-caption" className="field-label mt-5">
              Caption
            </label>
            <input
              id="media-caption"
              type="text"
              value={caption}
              disabled={!canWrite}
              onChange={(e) => setCaption(e.target.value)}
              className="field-input"
            />

            {item.isManaged && (
              <p className="mt-5 border border-standby/40 bg-standby/10 p-3 text-xs text-standby">
                This asset ships with the build. Its text can be edited here, but the file itself is
                replaced by updating the source image and rebuilding.
              </p>
            )}

            <div className="mt-6 flex items-center justify-between gap-4">
              <button
                type="button"
                disabled={!canWrite}
                onClick={() => onSave(alt, caption)}
                className="btn btn-primary py-2.5"
              >
                SAVE
              </button>
              {canDelete && !item.isManaged && (
                <ConfirmButton
                  label="Delete asset"
                  confirmLabel="Delete permanently?"
                  onConfirm={onDelete}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
