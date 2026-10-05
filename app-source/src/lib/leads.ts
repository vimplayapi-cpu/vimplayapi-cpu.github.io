import { getDb, now } from '@/lib/db/client';
import { getSettings, settingNumber } from '@/lib/db/queries';

/**
 * Shared spam heuristics for the public forms.
 *
 * None of these are visible to a legitimate user: a hidden honeypot field, the
 * elapsed time between render and submit, and a crude link-density check on
 * the message body. A submission that trips them is stored with status 'spam'
 * rather than discarded, so an administrator can review false positives.
 */

export interface SpamVerdict {
  isSpam: boolean;
  reasons: string[];
}

export function assessSpam(input: {
  honeypot?: string;
  renderedAt?: number;
  message?: string;
}): SpamVerdict {
  const settings = getSettings();
  const minFill = settingNumber(settings, 'forms.min_fill_seconds', 3);
  const reasons: string[] = [];

  if (input.honeypot && input.honeypot.trim() !== '') reasons.push('honeypot');

  if (input.renderedAt && input.renderedAt > 0) {
    const elapsed = Date.now() / 1000 - input.renderedAt;
    // Negative elapsed means a forged or clock-skewed timestamp.
    if (elapsed < minFill) reasons.push('too_fast');
    // A form open for more than a day is almost certainly a replayed payload.
    if (elapsed > 86_400) reasons.push('stale_token');
  }

  const message = input.message ?? '';
  const links = (message.match(/https?:\/\//gi) ?? []).length;
  if (links >= 4) reasons.push('link_density');
  if (/\[url=|\bbit\.ly\/|\bviagra\b|\bcasino bonus\b/i.test(message)) reasons.push('spam_pattern');

  return { isSpam: reasons.length > 0, reasons };
}

/** Per-IP submission ceiling, configurable from site settings. */
export function leadRateLimitConfig(): { limit: number; windowSeconds: number } {
  const settings = getSettings();
  return {
    limit: settingNumber(settings, 'forms.rate_limit.max', 5),
    windowSeconds: settingNumber(settings, 'forms.rate_limit.window_s', 3600),
  };
}

/** Records a conversion in the analytics table without any personal data. */
export function recordConversion(type: 'inquiry' | 'demo_request', path: string, entityId?: number) {
  const t = now();
  const day = new Date(t * 1000).toISOString().slice(0, 10);
  getDb()
    .prepare(`
      INSERT INTO analytics_events (type, path, entity_id, referrer_host, country, device, visitor_hash, day, created_at)
      VALUES (?, ?, ?, '', '', '', '', ?, ?)
    `)
    .run(type, path, entityId ?? null, day, t);
}
