import type { Metadata } from 'next';

/**
 * Admin root. The back office is never indexed and never cached — the
 * corresponding headers are also set in next.config.ts so they apply to
 * every response, not only to documents.
 */
export const metadata: Metadata = {
  title: 'Back Office — Live Miracle',
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-midnight">{children}</div>;
}
