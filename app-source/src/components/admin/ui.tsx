'use client';

import { useState, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

/** Shared back-office primitives. Denser and plainer than the public site. */

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-start justify-between gap-5 border-b border-hairline pb-6">
      <div>
        <h1 className="font-display text-2xl font-semibold uppercase tracking-tight text-chalk">
          {title}
        </h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </header>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('border border-hairline bg-charcoal/50 p-6', className)}>{children}</div>;
}

export function StatTile({
  label,
  value,
  sub,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: 'default' | 'accent' | 'warn';
}) {
  return (
    <div className="border border-hairline bg-charcoal/50 p-5">
      <p className="tech-label">{label}</p>
      <p
        className={cn(
          'mt-3 font-display text-3xl font-semibold tabular tracking-tight',
          tone === 'accent' ? 'text-signal' : tone === 'warn' ? 'text-standby' : 'text-chalk',
        )}
      >
        {value}
      </p>
      {sub && <p className="mt-1.5 text-xs text-muted">{sub}</p>}
    </div>
  );
}

/**
 * Horizontal bar list — used for top pages, sources, countries and devices.
 * Bars are proportional to the largest value in the set.
 */
export function BarList({
  items,
  emptyLabel = 'No data yet',
}: {
  items: { label: string; value: number }[];
  emptyLabel?: string;
}) {
  if (items.length === 0) {
    return <p className="py-6 text-sm text-muted">{emptyLabel}</p>;
  }
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item.label} className="relative">
          <div className="flex items-center justify-between gap-4 px-2.5 py-2">
            <span className="relative z-10 truncate text-sm text-mist">{item.label}</span>
            <span className="relative z-10 shrink-0 font-mono text-tech-sm tabular text-chalk">
              {item.value.toLocaleString()}
            </span>
          </div>
          <div
            aria-hidden
            className="absolute inset-y-0 left-0 bg-signal/12"
            style={{ width: `${(item.value / max) * 100}%` }}
          />
        </li>
      ))}
    </ul>
  );
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'ok' | 'warn' | 'bad' | 'accent';
}) {
  const tones = {
    neutral: 'border-hairline text-muted',
    ok: 'border-ready/40 text-ready bg-ready/10',
    warn: 'border-standby/40 text-standby bg-standby/10',
    bad: 'border-live/40 text-live bg-live/10',
    accent: 'border-signal/40 text-signal bg-signal/10',
  };
  return (
    <span className={cn('inline-block border px-2 py-1 font-mono text-tech-sm uppercase', tones[tone])}>
      {children}
    </span>
  );
}

export function AdminTable({
  head,
  children,
}: {
  head: string[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto border border-hairline">
      <table className="w-full min-w-[44rem] border-collapse text-left">
        <thead>
          <tr className="border-b border-hairline bg-graphite/40">
            {head.map((h) => (
              <th key={h} className="px-4 py-3 font-mono text-tech-sm uppercase text-muted">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center text-sm text-muted">
        {children}
      </td>
    </tr>
  );
}

/** Inline save/error feedback shared by every admin form. */
export type SaveState = { status: 'idle' | 'saving' | 'saved' | 'error'; message?: string };

export function SaveStatus({ state }: { state: SaveState }) {
  return (
    <div aria-live="polite" className="min-h-[1.5rem]">
      {state.status === 'saving' && (
        <p className="font-mono text-tech-sm uppercase text-muted">Saving…</p>
      )}
      {state.status === 'saved' && (
        <p className="font-mono text-tech-sm uppercase text-ready">Saved</p>
      )}
      {state.status === 'error' && (
        <p className="font-mono text-tech-sm uppercase text-live">{state.message ?? 'Save failed'}</p>
      )}
    </div>
  );
}

/** Destructive action with a two-step confirm — no accidental deletes. */
export function ConfirmButton({
  label,
  confirmLabel = 'Confirm',
  onConfirm,
  className,
  disabled,
}: {
  label: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
  className?: string;
  disabled?: boolean;
}) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!armed) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setArmed(true)}
        className={cn(
          'font-mono text-tech-sm uppercase text-muted transition-colors hover:text-live disabled:opacity-40',
          className,
        )}
      >
        {label}
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-3">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await onConfirm();
          } finally {
            setBusy(false);
            setArmed(false);
          }
        }}
        className="font-mono text-tech-sm uppercase text-live"
      >
        {busy ? 'Working…' : confirmLabel}
      </button>
      <button
        type="button"
        onClick={() => setArmed(false)}
        className="font-mono text-tech-sm uppercase text-muted"
      >
        Cancel
      </button>
    </span>
  );
}

export function formatDate(unix: number): string {
  return new Date(unix * 1000).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
