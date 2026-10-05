'use client';

import { usePathname } from 'next/navigation';
import { IS_STATIC } from '@/lib/static-mode';
import { useEffect, useRef } from 'react';

/**
 * Cookieless analytics beacon.
 *
 * Fires one event per route change. No identifiers are set on the client — the
 * server derives a daily-rotating visitor digest — so there is nothing here to
 * consent to and nothing that follows a visitor between sessions.
 */
export function Beacon({
  type = 'pageview',
  entityId,
}: {
  type?: 'pageview' | 'studio_view' | 'gallery_view';
  entityId?: number;
}) {
  const pathname = usePathname();
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    // The static build has no /api to post to; sending would only produce
    // console noise and failed requests on every navigation.
    if (IS_STATIC) return;

    const key = `${type}:${pathname}:${entityId ?? ''}`;
    // React strict mode double-invokes effects in development; dedupe on key.
    if (lastSent.current === key) return;
    lastSent.current = key;

    const payload = JSON.stringify({ type, path: pathname, entity_id: entityId ?? null });

    // sendBeacon survives the page being unloaded mid-flight; fetch is the
    // fallback. Analytics must never block or surface an error to the visitor.
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/analytics', new Blob([payload], { type: 'application/json' }));
        return;
      }
    } catch {
      /* fall through to fetch */
    }

    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {
      /* analytics is best-effort */
    });
  }, [pathname, type, entityId]);

  return null;
}
