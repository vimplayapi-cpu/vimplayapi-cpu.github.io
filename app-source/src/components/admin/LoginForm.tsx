'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui';
import { TextField } from '@/components/forms/Field';

/**
 * Administrator sign-in.
 *
 * The server returns a single generic message for every credential failure, so
 * nothing here can be used to work out whether an address is registered.
 */
export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');

    const data = Object.fromEntries(new FormData(e.currentTarget).entries());

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => null);

      if (res.ok && json?.ok) {
        // A forced rotation sends the user to the account page instead.
        router.push(json.data?.mustChangePassword ? '/admin/account' : '/admin');
        router.refresh();
        return;
      }

      setError(json?.error?.message ?? 'Sign-in failed. Please try again.');
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
      <TextField
        label="Email"
        name="email"
        type="email"
        required
        autoComplete="username"
      />
      <TextField
        label="Password"
        name="password"
        type="password"
        required
        autoComplete="current-password"
      />

      <div aria-live="polite" className="min-h-[1.25rem]">
        {error && (
          <p className="border border-live/40 bg-live/10 px-3 py-2 font-mono text-tech-sm uppercase text-live">
            {error}
          </p>
        )}
      </div>

      <Button type="submit" disabled={busy} className="w-full">
        {busy ? 'SIGNING IN…' : 'SIGN IN'}
      </Button>
    </form>
  );
}
