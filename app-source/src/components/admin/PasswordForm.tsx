'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useAdmin } from './AdminShell';
import { TextField } from '@/components/forms/Field';
import { Button } from '@/components/ui';

/**
 * Password rotation. On success the server revokes every other session for the
 * account, so a stolen cookie elsewhere stops working immediately.
 */
export function PasswordForm() {
  const { api } = useAdmin();
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage('');

    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    const res = await api('/api/admin/account/password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    const json = await res.json().catch(() => null);
    setBusy(false);

    if (res.ok && json?.ok) {
      form.reset();
      setDone(true);
      setMessage(
        json.data.revokedOtherSessions > 0
          ? `Password updated. ${json.data.revokedOtherSessions} other session(s) signed out.`
          : 'Password updated.',
      );
      router.refresh();
      return;
    }

    setErrors((json?.error?.details as Record<string, string>) ?? {});
    setMessage(json?.error?.message ?? 'Could not change password.');
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <TextField
        label="Current password"
        name="current_password"
        type="password"
        required
        autoComplete="current-password"
        error={errors.current_password}
      />
      <TextField
        label="New password"
        name="new_password"
        type="password"
        required
        autoComplete="new-password"
        hint="At least 12 characters, combining three of: lowercase, uppercase, numbers, symbols."
        error={errors.new_password}
      />
      <TextField
        label="Confirm new password"
        name="confirm_password"
        type="password"
        required
        autoComplete="new-password"
        error={errors.confirm_password}
      />

      <div aria-live="polite" className="min-h-[1.25rem]">
        {message && (
          <p
            className={`border px-3 py-2 font-mono text-tech-sm uppercase ${
              done ? 'border-ready/40 bg-ready/10 text-ready' : 'border-live/40 bg-live/10 text-live'
            }`}
          >
            {message}
          </p>
        )}
      </div>

      <Button type="submit" disabled={busy}>
        {busy ? 'UPDATING…' : 'CHANGE PASSWORD'}
      </Button>
    </form>
  );
}
