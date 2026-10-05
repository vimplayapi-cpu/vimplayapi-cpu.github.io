'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useAdmin } from './AdminShell';
import { Card, SaveStatus, type SaveState } from './ui';
import { Button } from '@/components/ui';

export interface SettingRow {
  key: string;
  value: string;
  value_type: string;
  label: string;
  hint: string;
  group_key: string;
}

const GROUP_LABEL: Record<string, string> = {
  identity: 'Site identity',
  contact: 'Contact & WhatsApp',
  social: 'Social media',
  seo: 'SEO defaults',
  forms: 'Forms & spam protection',
  analytics: 'Analytics',
};

/**
 * Site settings editor.
 *
 * The WhatsApp number lives here rather than in the frontend source, which is
 * what lets the public button be configured without a deploy and keeps the
 * number out of the client bundle until an administrator enables it.
 */
export function SettingsEditor({ settings }: { settings: SettingRow[] }) {
  const { api, can } = useAdmin();
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(settings.map((s) => [s.key, s.value])),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<SaveState>({ status: 'idle' });

  const canWrite = can('settings.write');
  const dirty = settings.some((s) => values[s.key] !== s.value);

  const groups = [...new Set(settings.map((s) => s.group_key))];

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setState({ status: 'saving' });
    setErrors({});

    const changed = settings
      .filter((s) => values[s.key] !== s.value)
      .map((s) => ({ key: s.key, value: values[s.key] }));

    if (changed.length === 0) {
      setState({ status: 'saved' });
      return;
    }

    const res = await api('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify({ settings: changed }),
    });
    const json = await res.json().catch(() => null);

    if (res.ok && json?.ok) {
      setState({ status: 'saved' });
      router.refresh();
    } else {
      setErrors((json?.error?.details as Record<string, string>) ?? {});
      setState({ status: 'error', message: json?.error?.message ?? 'Save failed' });
    }
  }

  return (
    <form onSubmit={save} className="space-y-8">
      {groups.map((group) => (
        <Card key={group}>
          <h2 className="tech-label mb-6">{GROUP_LABEL[group] ?? group}</h2>
          <div className="space-y-6">
            {settings
              .filter((s) => s.group_key === group)
              .map((setting) => {
                const id = `setting-${setting.key.replace(/\./g, '-')}`;
                const isBool = setting.value_type === 'bool';

                return (
                  <div key={setting.key}>
                    {isBool ? (
                      <label className="flex cursor-pointer items-start gap-3">
                        <input
                          id={id}
                          type="checkbox"
                          checked={values[setting.key] === 'true'}
                          disabled={!canWrite}
                          onChange={(e) =>
                            setValues((v) => ({ ...v, [setting.key]: e.target.checked ? 'true' : 'false' }))
                          }
                          className="mt-0.5 h-4 w-4 shrink-0 accent-[#3DDCE8]"
                        />
                        <span>
                          <span className="block font-mono text-tech uppercase text-chalk">
                            {setting.label}
                          </span>
                          {setting.hint && (
                            <span className="mt-1 block text-xs text-muted">{setting.hint}</span>
                          )}
                        </span>
                      </label>
                    ) : (
                      <>
                        <label htmlFor={id} className="field-label">
                          {setting.label}
                        </label>
                        <input
                          id={id}
                          type={setting.value_type === 'number' ? 'number' : 'text'}
                          value={values[setting.key] ?? ''}
                          disabled={!canWrite}
                          onChange={(e) => setValues((v) => ({ ...v, [setting.key]: e.target.value }))}
                          aria-invalid={errors[setting.key] ? 'true' : undefined}
                          className="field-input"
                        />
                        {setting.hint && <p className="mt-2 text-xs text-muted">{setting.hint}</p>}
                      </>
                    )}
                    {errors[setting.key] && <p className="field-error">{errors[setting.key]}</p>}
                    <p className="mt-1.5 font-mono text-[0.6rem] uppercase tracking-wider text-muted/60">
                      {setting.key}
                    </p>
                  </div>
                );
              })}
          </div>
        </Card>
      ))}

      <div className="flex items-center justify-between gap-6">
        <SaveStatus state={state} />
        <Button type="submit" disabled={!canWrite || !dirty || state.status === 'saving'}>
          {dirty ? 'SAVE SETTINGS' : 'NO CHANGES'}
        </Button>
      </div>
    </form>
  );
}
