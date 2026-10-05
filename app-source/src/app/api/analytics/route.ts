import { NextResponse } from 'next/server';
import { z } from 'zod';

import { withPublicApi } from '@/lib/auth/guard';
import { getDb, now } from '@/lib/db/client';
import { getSettings, settingBool } from '@/lib/db/queries';
import { dailyVisitorHash } from '@/lib/env';
import { clientIp, country, deviceClass, referrerHost, userAgent } from '@/lib/security/request';

export const dynamic = 'force-dynamic';

/**
 * First-party, cookieless analytics collection.
 *
 * What is stored: the path, an entity id for studio/gallery views, the
 * referring host, a two-letter country, a device class, and a visitor digest
 * that is salted with the current date. Nothing here identifies a person, and
 * because the salt rotates daily the same visitor cannot be followed across
 * days. No raw IP or user-agent string is written.
 */
const eventSchema = z.object({
  type: z.enum(['pageview', 'studio_view', 'gallery_view']),
  // Path only — query strings are dropped so we never capture incidental PII.
  path: z.string().max(300).transform((p) => p.split('?')[0].split('#')[0]),
  entity_id: z.coerce.number().int().positive().nullable().optional(),
});

async function handler({ req }: { req: Request }) {
  const settings = getSettings();
  if (!settingBool(settings, 'analytics.enabled')) {
    return NextResponse.json({ ok: true, data: { recorded: false } });
  }

  const body = await req.json().catch(() => null);
  const parsed = eventSchema.safeParse(body);
  // Malformed beacons are ignored silently — never surface an error to a page.
  if (!parsed.success) return NextResponse.json({ ok: true, data: { recorded: false } });

  const t = now();
  const day = new Date(t * 1000).toISOString().slice(0, 10);
  const ua = userAgent(req);

  getDb()
    .prepare(`
      INSERT INTO analytics_events (type, path, entity_id, referrer_host, country, device, visitor_hash, day, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      parsed.data.type,
      parsed.data.path,
      parsed.data.entity_id ?? null,
      referrerHost(req),
      country(req),
      deviceClass(ua),
      dailyVisitorHash(clientIp(req), ua, day),
      day,
      t,
    );

  return NextResponse.json({ ok: true, data: { recorded: true } });
}

// A generous ceiling: enough to stop a flood, high enough that a real browsing
// session is never throttled.
export const POST = withPublicApi(handler, {
  rateLimit: { key: 'analytics', limit: 300, windowSeconds: 3600 },
});
