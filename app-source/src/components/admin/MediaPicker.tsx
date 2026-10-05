'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useAdmin } from './AdminShell';
import { formatBytes } from './ui';

export interface PickerItem {
  id: number;
  kind: string;
  originalName: string;
  alt: string;
  caption: string;
  thumb: string | null;
  bytes: number;
  width: number | null;
  height: number | null;
}

/**
 * Modal media browser used wherever an asset has to be attached.
 *
 * Doubles as an uploader so an editor never has to leave the record they are
 * working on. Filtered to a single kind by the caller, so a video slot cannot
 * be handed an image (the API enforces the same rule server-side).
 */
export function MediaPicker({
  kind,
  onSelect,
  onClose,
}: {
  kind: 'image' | 'video';
  onSelect: (item: PickerItem) => void;
  onClose: () => void;
}) {
  const { api, can } = useAdmin();
  const [items, setItems] = useState<PickerItem[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ kind, limit: '120' });
    if (query) params.set('q', query);
    const res = await api(`/api/admin/media?${params}`);
    const json = await res.json().catch(() => null);
    setItems(json?.ok ? json.data.items : []);
    setLoading(false);
  }, [api, kind, query]);

  useEffect(() => {
    void load();
  }, [load]);

  // Escape closes; background scroll is locked while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  async function upload(file: File) {
    setUploading(true);
    setError('');
    const form = new FormData();
    form.append('file', file);

    // Note: no Content-Type header — the browser must set the multipart
    // boundary itself. The CSRF token still travels in the header.
    const res = await api('/api/admin/media', { method: 'POST', body: form });
    const json = await res.json().catch(() => null);

    setUploading(false);
    if (res.ok && json?.ok) {
      await load();
    } else {
      setError(json?.error?.message ?? 'Upload failed.');
    }
  }

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Choose ${kind === 'image' ? 'an image' : 'a video'}`}
      className="fixed inset-0 z-[200] flex flex-col bg-void/96 backdrop-blur-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline px-6 py-4">
        <h2 className="font-mono text-tech uppercase text-chalk">
          Media library — {kind === 'image' ? 'images' : 'videos'}
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, alt or caption"
            aria-label="Search media"
            className="field-input w-64 py-2"
          />
          {can('media.write') && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept={kind === 'image' ? 'image/*' : 'video/mp4,video/webm,video/quicktime'}
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void upload(f);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="btn btn-secondary py-2.5"
              >
                {uploading ? 'UPLOADING…' : 'UPLOAD'}
              </button>
            </>
          )}
          <button type="button" onClick={onClose} className="btn btn-ghost text-chalk">
            CLOSE
          </button>
        </div>
      </div>

      {error && (
        <p className="border-b border-live/40 bg-live/10 px-6 py-3 font-mono text-tech-sm uppercase text-live">
          {error}
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        {loading ? (
          <p className="font-mono text-tech uppercase text-muted">Loading…</p>
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <p className="tech-label">No {kind}s found</p>
            <p className="mt-3 text-sm text-muted">
              {can('media.write')
                ? 'Upload one using the button above.'
                : 'You do not have permission to upload media.'}
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelect(item)}
                  className="group block w-full border border-hairline text-left transition-colors hover:border-signal"
                >
                  <span className="block aspect-[4/3] overflow-hidden bg-midnight">
                    {item.thumb && item.kind === 'image' ? (
                      // eslint-disable-next-line @next/next/no-img-element -- admin preview only
                      <img src={item.thumb} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full items-center justify-center font-mono text-tech-sm uppercase text-muted">
                        {item.kind}
                      </span>
                    )}
                  </span>
                  <span className="block p-3">
                    <span className="block truncate text-xs text-chalk">{item.originalName}</span>
                    <span className="mt-1 block font-mono text-tech-sm uppercase text-muted">
                      {item.width && item.height ? `${item.width}×${item.height} · ` : ''}
                      {formatBytes(item.bytes)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
