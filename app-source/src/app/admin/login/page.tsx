import { redirect } from 'next/navigation';

import { LoginForm } from '@/components/admin/LoginForm';
import { Wordmark } from '@/components/brand/Wordmark';
import { getSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  // Already signed in — no reason to show the form again.
  const session = await getSession();
  if (session) redirect(session.user.mustChangePassword ? '/admin/account' : '/admin');

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-12 flex justify-center">
          <Wordmark />
        </div>

        <div className="panel frame-ticks p-8">
          <h1 className="font-display text-xl font-semibold uppercase tracking-tight text-chalk">
            Back office
          </h1>
          <p className="mt-2 text-sm text-muted">Sign in to manage site content.</p>

          <LoginForm />
        </div>

        <p className="mt-8 text-center font-mono text-tech-sm uppercase text-muted">
          Authorised access only · All activity is logged
        </p>
      </div>
    </main>
  );
}
