/**
 * Route loading skeleton for the public site. Mirrors the common page
 * composition — eyebrow, display headline, body, then a content grid — so the
 * transition into real content does not jump.
 */
export default function Loading() {
  return (
    <div className="shell pt-40 sm:pt-48" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>

      <div className="max-w-4xl" aria-hidden>
        <div className="h-2.5 w-40 animate-pulse bg-graphite" />
        <div className="mt-8 space-y-4">
          <div className="h-12 w-full animate-pulse bg-graphite sm:h-16" />
          <div className="h-12 w-3/4 animate-pulse bg-graphite sm:h-16" />
        </div>
        <div className="mt-8 space-y-3">
          <div className="h-3.5 w-full animate-pulse bg-graphite/60" />
          <div className="h-3.5 w-5/6 animate-pulse bg-graphite/60" />
        </div>
      </div>

      <div className="mt-20 grid gap-8 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="space-y-4">
            <div className="aspect-[4/3] w-full animate-pulse bg-graphite" />
            <div className="h-2.5 w-24 animate-pulse bg-graphite/60" />
          </div>
        ))}
      </div>
    </div>
  );
}
