'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useAdmin } from './AdminShell';
import { Card, SaveStatus, type SaveState } from './ui';
import { Button } from '@/components/ui';

export interface ContentBlock {
  id: number;
  page: string;
  block_key: string;
  value: string;
  value_type: string;
  label: string;
  hint: string;
}

/**
 * Page-copy editor.
 *
 * Everything the public site renders as text comes through here, so a copy
 * change never needs a deploy. Blocks are saved as a set, in one transaction.
 */
export function ContentEditor({ page, blocks }: { page: string; blocks: ContentBlock[] }) {
  const { api, can } = useAdmin();
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(blocks.map((b) => [b.block_key, b.value])),
  );
  const [state, setState] = useState<SaveState>({ status: 'idle' });
  const canWrite = can('content.write');

  const dirty = blocks.some((b) => values[b.block_key] !== b.value);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setState({ status: 'saving' });

    const payload = {
      blocks: blocks
        .filter((b) => values[b.block_key] !== b.value)
        .map((b) => ({ page: b.page, block_key: b.block_key, value: values[b.block_key] })),
    };

    if (payload.blocks.length === 0) {
      setState({ status: 'saved' });
      return;
    }

    const res = await api('/api/admin/content', { method: 'PUT', body: JSON.stringify(payload) });
    const json = await res.json().catch(() => null);

    if (res.ok && json?.ok) {
      setState({ status: 'saved' });
      router.refresh();
    } else {
      setState({ status: 'error', message: json?.error?.message ?? 'Save failed' });
    }
  }

  if (blocks.length === 0) {
    return (
      <Card>
        <p className="text-sm text-muted">No editable copy is registered for this page.</p>
      </Card>
    );
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <Card className="space-y-6">
        {blocks.map((block) => {
          const id = `block-${block.id}`;
          const multiline =
            block.value_type === 'richtext' || (values[block.block_key] ?? '').length > 90;

          return (
            <div key={block.id}>
              <label htmlFor={id} className="field-label">
                {block.label || block.block_key}
              </label>

              {block.value_type === 'json' ? (
                <textarea
                  id={id}
                  rows={3}
                  value={values[block.block_key] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [block.block_key]: e.target.value }))}
                  disabled={!canWrite}
                  className="field-input font-mono text-xs"
                  spellCheck={false}
                />
              ) : multiline ? (
                <textarea
                  id={id}
                  rows={block.value_type === 'richtext' ? 10 : 4}
                  value={values[block.block_key] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [block.block_key]: e.target.value }))}
                  disabled={!canWrite}
                  className="field-input resize-y"
                />
              ) : (
                <input
                  id={id}
                  type="text"
                  value={values[block.block_key] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [block.block_key]: e.target.value }))}
                  disabled={!canWrite}
                  className="field-input"
                />
              )}

              <p className="mt-2 flex flex-wrap gap-x-4 text-xs text-muted">
                <code className="font-mono">{block.block_key}</code>
                {block.hint && <span>{block.hint}</span>}
              </p>
            </div>
          );
        })}
      </Card>

      <div className="flex items-center justify-between gap-6">
        <SaveStatus state={state} />
        <Button type="submit" disabled={!canWrite || !dirty || state.status === 'saving'}>
          {dirty ? 'SAVE CHANGES' : 'NO CHANGES'}
        </Button>
      </div>
    </form>
  );
}
