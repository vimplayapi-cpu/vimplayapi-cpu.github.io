'use client';

import { useEffect } from 'react';

/**
 * Route-level error boundary.
 *
 * Deliberately shows no stack, message or digest detail to the visitor — the
 * real error is logged server-side. Client components cannot read the database,
 * so the copy here is static rather than CMS-driven.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[route-error]', error);
  }, [error]);

  return (
    <main className="flex min-h-dvh items-center">
      <div className="shell py-20">
        <p className="font-mono text-tech-lg uppercase text-live">SIGNAL INTERRUPTED</p>

        <h1 className="mt-6 text-display-md uppercase text-chalk">
          Something went wrong
          <br />
          loading this page.
        </h1>

        <p className="mt-7 max-w-prose text-base leading-relaxed text-mist">
          The page could not be rendered. This has been logged. You can retry, or return to the
          home page.
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <button type="button" onClick={reset} className="btn btn-primary">
            TRY AGAIN
          </button>
          <a href="/" className="btn btn-secondary">
            RETURN HOME
          </a>
        </div>

        {error.digest && (
          <p className="mt-12 font-mono text-tech-sm uppercase text-muted">
            Reference: {error.digest}
          </p>
        )}
      </div>
    </main>
  );
}
