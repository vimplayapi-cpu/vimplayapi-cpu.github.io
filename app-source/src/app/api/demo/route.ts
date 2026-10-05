import { NextResponse } from 'next/server';

import { ApiError, withPublicApi } from '@/lib/auth/guard';
import { getDb, now } from '@/lib/db/client';
import { assessSpam, leadRateLimitConfig, recordConversion } from '@/lib/leads';
import { demoRequestSchema, fieldErrors } from '@/lib/validation/schemas';

export const dynamic = 'force-dynamic';

/**
 * Studio demo request.
 *
 * The requested studio arrives as a slug and is resolved server-side to an id —
 * the client never supplies a foreign key directly. The resolved name is also
 * denormalised onto the row so the record stays readable if the studio is
 * later deleted.
 */
async function handler({ req, ip, ua }: { req: Request; ip: string; ua: string }) {
  const body = await req.json().catch(() => null);
  const parsed = demoRequestSchema.safeParse(body);

  if (!parsed.success) {
    throw new ApiError(400, 'Please check the highlighted fields.', 'invalid', fieldErrors(parsed.error));
  }

  const d = parsed.data;
  const db = getDb();

  let studioId: number | null = null;
  let studioLabel = '';
  if (d.studio_slug) {
    const studio = db
      .prepare('SELECT id, code, name FROM studios WHERE slug = ? AND is_published = 1')
      .get(d.studio_slug) as { id: number; code: string; name: string } | undefined;
    if (studio) {
      studioId = studio.id;
      studioLabel = `${studio.code} — ${studio.name}`;
    }
  }

  const spam = assessSpam({ honeypot: d.website, renderedAt: d._t, message: d.message });

  const result = db
    .prepare(`
      INSERT INTO demo_requests (name, company, business_email, phone, country, studio_id, studio_label,
                                 operators, project_type, launch_period, required_services, message,
                                 status, ip_hash, user_agent, created_at)
      VALUES (@name, @company, @business_email, @phone, @country, @studio_id, @studio_label,
              @operators, @project_type, @launch_period, @required_services, @message,
              @status, @ip_hash, @user_agent, @created_at)
    `)
    .run({
      name: d.name,
      company: d.company,
      business_email: d.business_email,
      phone: d.phone,
      country: d.country,
      studio_id: studioId,
      studio_label: studioLabel,
      operators: d.operators,
      project_type: d.project_type,
      launch_period: d.launch_period,
      required_services: JSON.stringify(d.required_services ?? []),
      message: d.message,
      status: spam.isSpam ? 'spam' : 'new',
      ip_hash: ip,
      user_agent: ua,
      created_at: now(),
    });

  if (!spam.isSpam) recordConversion('demo_request', '/demo', Number(result.lastInsertRowid));

  return NextResponse.json({ ok: true, data: { received: true } }, { status: 201 });
}

export const POST = withPublicApi(handler, {
  rateLimit: () => ({ key: 'demo', ...leadRateLimitConfig(), blockSeconds: 3600 }),
});
