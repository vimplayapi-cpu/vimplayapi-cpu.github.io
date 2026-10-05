import { z } from 'zod';

import { ApiError, withAdminApi } from '@/lib/auth/guard';
import { getDb, now } from '@/lib/db/client';
import { fieldErrors, settingSchema } from '@/lib/validation/schemas';

export const dynamic = 'force-dynamic';

export const GET = withAdminApi(
  () =>
    getDb()
      .prepare(`
        SELECT key, value, value_type, label, hint, group_key, sort_order, updated_at
        FROM site_settings ORDER BY group_key, sort_order
      `)
      .all(),
  { permission: 'settings.write' },
);

const bulkSchema = z.object({ settings: z.array(settingSchema).min(1).max(200) });

/**
 * Saves site settings.
 *
 * Only keys that already exist are updated — a request cannot introduce new
 * settings keys, which keeps the surface fixed and prevents an attacker with a
 * stolen editor session from planting arbitrary configuration.
 */
export const PUT = withAdminApi(
  async ({ req, audit, session }) => {
    const body = await req.json().catch(() => null);
    const parsed = bulkSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, 'Invalid settings payload.', 'invalid', fieldErrors(parsed.error));
    }

    const db = getDb();
    const t = now();
    const known = new Set(
      (db.prepare('SELECT key FROM site_settings').all() as { key: string }[]).map((r) => r.key),
    );

    const unknown = parsed.data.settings.filter((s) => !known.has(s.key)).map((s) => s.key);
    if (unknown.length) {
      throw new ApiError(400, `Unknown setting key: ${unknown[0]}`, 'invalid');
    }

    // Guard the WhatsApp toggle: enabling it without a number would render a
    // dead button, so reject the combination rather than shipping it.
    const incoming = new Map(parsed.data.settings.map((s) => [s.key, s.value]));
    const enabled =
      incoming.get('whatsapp.enabled') ??
      (db.prepare("SELECT value FROM site_settings WHERE key = 'whatsapp.enabled'").get() as
        | { value: string }
        | undefined)?.value;
    const number =
      incoming.get('whatsapp.number') ??
      (db.prepare("SELECT value FROM site_settings WHERE key = 'whatsapp.number'").get() as
        | { value: string }
        | undefined)?.value;
    if (enabled === 'true' && !String(number ?? '').replace(/\D/g, '')) {
      throw new ApiError(400, 'Add a WhatsApp business number before enabling the button.', 'invalid', {
        'whatsapp.number': 'Required when the WhatsApp button is enabled.',
      });
    }

    const stmt = db.prepare('UPDATE site_settings SET value = ?, updated_by = ?, updated_at = ? WHERE key = ?');
    let changed = 0;
    db.transaction(() => {
      for (const s of parsed.data.settings) {
        changed += stmt.run(s.value, session.user.id, t, s.key).changes;
      }
    })();

    // Values may include a phone number; the audit meta records only the keys.
    audit('settings.update', 'site_settings', undefined, {
      keys: parsed.data.settings.map((s) => s.key),
    });
    return { updated: changed };
  },
  { permission: 'settings.write' },
);
