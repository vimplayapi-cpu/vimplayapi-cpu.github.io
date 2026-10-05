import { NextResponse } from 'next/server';

import { ApiError, withPublicApi } from '@/lib/auth/guard';
import { getDb, now } from '@/lib/db/client';
import { assessSpam, leadRateLimitConfig, recordConversion } from '@/lib/leads';
import { contactInquirySchema, fieldErrors } from '@/lib/validation/schemas';

export const dynamic = 'force-dynamic';

/**
 * Public contact inquiry.
 *
 * Returns the same success shape whether or not the submission was flagged as
 * spam: a bot learns nothing, and a false-positive user is not stranded. Real
 * submissions land in the admin dashboard; flagged ones land there too, marked
 * as spam for review.
 */
async function handler({ req, ip, ua }: { req: Request; ip: string; ua: string }) {
  const body = await req.json().catch(() => null);
  const parsed = contactInquirySchema.safeParse(body);

  if (!parsed.success) {
    throw new ApiError(400, 'Please check the highlighted fields.', 'invalid', fieldErrors(parsed.error));
  }

  const d = parsed.data;
  const spam = assessSpam({ honeypot: d.website, renderedAt: d._t, message: d.message });

  const result = getDb()
    .prepare(`
      INSERT INTO inquiries (full_name, company, email, phone, country, service_interest,
                             project_type, message, status, ip_hash, user_agent, created_at)
      VALUES (@full_name, @company, @email, @phone, @country, @service_interest,
              @project_type, @message, @status, @ip_hash, @user_agent, @created_at)
    `)
    .run({
      full_name: d.full_name,
      company: d.company,
      email: d.email,
      phone: d.phone,
      country: d.country,
      service_interest: d.service_interest,
      project_type: d.project_type,
      message: d.message,
      status: spam.isSpam ? 'spam' : 'new',
      ip_hash: ip,
      user_agent: ua,
      created_at: now(),
    });

  if (!spam.isSpam) recordConversion('inquiry', '/contact', Number(result.lastInsertRowid));

  return NextResponse.json({ ok: true, data: { received: true } }, { status: 201 });
}

// Limits are resolved per request so an administrator can change them in
// site settings without a redeploy.
export const POST = withPublicApi(handler, {
  rateLimit: () => ({ key: 'contact', ...leadRateLimitConfig(), blockSeconds: 3600 }),
});
