import { z } from 'zod';

/**
 * Input validation for every endpoint that accepts data.
 *
 * These schemas are the single source of truth: the client uses them for
 * inline feedback and the server re-validates every request against the same
 * definitions. Client-side validation is treated purely as a convenience —
 * nothing is trusted until it has passed through here on the server.
 */

/** Strips C0/C1 control characters. Single-line values also lose tabs/newlines. */
const CONTROL_CHARS = /[\u0000-\u001F\u007F-\u009F]/g;
/** Same, but preserves newlines and tabs. */
const CONTROL_CHARS_KEEP_BREAKS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;

/** Single-line input: control characters removed, whitespace collapsed. */
const clean = (max: number) =>
  z
    .string()
    .transform((s) => s.replace(CONTROL_CHARS, '').replace(/\s+/g, ' ').trim())
    .pipe(z.string().max(max));

/** Multi-line input: line breaks preserved, runs of blank lines collapsed. */
const cleanMultiline = (max: number) =>
  z
    .string()
    .transform((s) =>
      s
        .replace(CONTROL_CHARS_KEEP_BREAKS, '')
        .replace(/\r\n?/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim(),
    )
    .pipe(z.string().max(max));

export const emailSchema = z
  .string()
  .trim()
  .min(5, 'Enter an email address.')
  .max(254, 'Email address is too long.')
  // Deliberately pragmatic rather than RFC-exhaustive: one @, a dot in the
  // domain, no spaces. Anything stricter rejects valid real-world addresses.
  .regex(/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/, 'Enter a valid email address.')
  .transform((s) => s.toLowerCase());

/**
 * Phone validation accepts international formats without being prescriptive
 * about separators. Requires 7–20 digits after stripping formatting.
 */
export const phoneSchema = z
  .string()
  .trim()
  .refine((s) => s === '' || /^[+()\-.\s\d]{7,32}$/.test(s), 'Enter a valid phone number.')
  .refine((s) => {
    if (s === '') return true;
    const digits = s.replace(/\D/g, '');
    return digits.length >= 7 && digits.length <= 20;
  }, 'Enter a valid phone number.');

const requiredPhone = phoneSchema.pipe(z.string().min(1, 'Enter a phone number.'));

/**
 * Anti-spam fields present on every public form:
 *  - `website` is a honeypot: hidden from users, so any value means a bot.
 *  - `_t` is the render timestamp; submissions faster than the configured
 *    minimum are rejected as automated.
 */
export const antiSpamSchema = z.object({
  // Deliberately permissive: a filled honeypot must NOT fail validation. The
  // submission is accepted, flagged as spam by assessSpam() and stored for
  // review, so an automated client gets a normal 201 and learns nothing about
  // having been detected.
  website: z.string().max(200).optional().default(''),
  _t: z.coerce.number().int().nonnegative().optional().default(0),
});

/** The four supplied markets, plus an escape hatch. Used by the form selects. */
export const COUNTRIES = ['Georgia', 'Armenia', 'Bulgaria', 'Ukraine', 'Other'] as const;

/** Project types offered on the inquiry and demo forms. */
export const PROJECT_TYPES = [
  'New studio build',
  'Custom studio design',
  'Shared production capacity',
  'Streaming technology only',
  'Production staffing',
  'Training & operations',
  'Other',
] as const;

/** Indicative launch windows offered on the demo form. */
export const LAUNCH_PERIODS = [
  'As soon as possible',
  'Within 3 months',
  '3–6 months',
  '6–12 months',
  'Later than 12 months',
  'Not yet decided',
] as const;

export const contactInquirySchema = antiSpamSchema.extend({
  full_name: clean(120).pipe(z.string().min(2, 'Enter your full name.')),
  company: clean(160).optional().default(''),
  email: emailSchema,
  phone: phoneSchema.optional().default(''),
  country: clean(80).optional().default(''),
  service_interest: clean(120).optional().default(''),
  project_type: clean(120).optional().default(''),
  message: cleanMultiline(4000).pipe(z.string().min(10, 'Please give us a little more detail.')),
});
export type ContactInquiryInput = z.infer<typeof contactInquirySchema>;

export const demoRequestSchema = antiSpamSchema.extend({
  name: clean(120).pipe(z.string().min(2, 'Enter your name.')),
  company: clean(160).optional().default(''),
  business_email: emailSchema,
  phone: requiredPhone,
  country: clean(80).optional().default(''),
  studio_slug: clean(80).optional().default(''),
  operators: clean(60).optional().default(''),
  project_type: clean(120).optional().default(''),
  launch_period: clean(120).optional().default(''),
  required_services: z.array(clean(120)).max(12).optional().default([]),
  message: cleanMultiline(4000).optional().default(''),
});
export type DemoRequestInput = z.infer<typeof demoRequestSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password.').max(200),
});

export const passwordChangeSchema = z
  .object({
    current_password: z.string().min(1, 'Enter your current password.').max(200),
    new_password: z.string().min(12, 'Use at least 12 characters.').max(200),
    confirm_password: z.string().max(200),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: 'Passwords do not match.',
    path: ['confirm_password'],
  })
  .refine((d) => d.new_password !== d.current_password, {
    message: 'Choose a password you have not used before.',
    path: ['new_password'],
  });

// ---------------------------------------------------------------------------
// Admin content schemas
// ---------------------------------------------------------------------------

export const slugSchema = z
  .string()
  .trim()
  .min(1, 'Enter a slug.')
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens only.');

const hexColour = z
  .string()
  .trim()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Enter a hex colour, e.g. #3DDCE8.');

export const studioSchema = z.object({
  slug: slugSchema,
  code: clean(40),
  name: clean(120).pipe(z.string().min(1, 'Enter a studio name.')),
  tagline: clean(200).optional().default(''),
  description: cleanMultiline(4000).optional().default(''),
  environment: cleanMultiline(4000).optional().default(''),
  capacity: clean(200).optional().default(''),
  production_characteristics: z.array(clean(240)).max(20).optional().default([]),
  technical_capabilities: z
    .array(z.object({ label: clean(120), value: clean(240) }))
    .max(30)
    .optional()
    .default([]),
  location_id: z.coerce.number().int().positive().nullable().optional(),
  status: z.enum(['available', 'limited', 'in_production', 'unavailable']),
  availability_note: clean(400).optional().default(''),
  accent: hexColour,
  cta_label: clean(60).optional().default('REQUEST INFORMATION'),
  seo_title: clean(200).optional().default(''),
  seo_description: clean(400).optional().default(''),
  is_published: z.coerce.boolean().optional().default(true),
});
export type StudioInput = z.infer<typeof studioSchema>;

export const serviceSchema = z.object({
  slug: slugSchema,
  code: clean(40),
  title: clean(160).pipe(z.string().min(1, 'Enter a title.')),
  summary: cleanMultiline(600).optional().default(''),
  body: cleanMultiline(8000).optional().default(''),
  inclusions: z
    .array(z.object({ title: clean(160), description: clean(600) }))
    .max(30)
    .optional()
    .default([]),
  icon: clean(40).optional().default(''),
  cta_label: clean(60).optional().default('REQUEST A DEMO'),
  seo_title: clean(200).optional().default(''),
  seo_description: clean(400).optional().default(''),
  is_published: z.coerce.boolean().optional().default(true),
});

export const locationSchema = z.object({
  slug: slugSchema,
  country: clean(120).pipe(z.string().min(1, 'Enter a country.')),
  country_code: clean(4).optional().default(''),
  city: clean(120).optional().default(''),
  address: cleanMultiline(400).optional().default(''),
  email: z.union([emailSchema, z.literal('')]).optional().default(''),
  phone: phoneSchema.optional().default(''),
  studio_availability: clean(300).optional().default(''),
  services: z.array(clean(120)).max(20).optional().default([]),
  map_x: z.coerce.number().min(0).max(100),
  map_y: z.coerce.number().min(0).max(100),
  is_published: z.coerce.boolean().optional().default(true),
});

export const timelineSchema = z.object({
  year: clean(40).optional().default(''),
  event: clean(240).optional().default(''),
  description: cleanMultiline(1200).optional().default(''),
  media_id: z.coerce.number().int().positive().nullable().optional(),
  is_published: z.coerce.boolean().optional().default(true),
});

export const galleryItemSchema = z.object({
  media_id: z.coerce.number().int().positive(),
  category_id: z.coerce.number().int().positive().nullable().optional(),
  studio_id: z.coerce.number().int().positive().nullable().optional(),
  title: clean(200).optional().default(''),
  caption: clean(400).optional().default(''),
  alt: clean(400).optional().default(''),
  is_published: z.coerce.boolean().optional().default(true),
});

export const mediaMetaSchema = z.object({
  alt: clean(400).optional().default(''),
  caption: clean(400).optional().default(''),
});

export const contentBlockSchema = z.object({
  page: clean(60),
  block_key: clean(120),
  value: cleanMultiline(20_000),
});

export const settingSchema = z.object({
  key: clean(120),
  value: cleanMultiline(4000),
});

export const userSchema = z.object({
  email: emailSchema,
  name: clean(120).pipe(z.string().min(1, 'Enter a name.')),
  role_id: z.coerce.number().int().positive(),
  is_active: z.coerce.boolean().optional().default(true),
  password: z.string().min(12).max(200).optional(),
});

export const leadUpdateSchema = z.object({
  status: z.enum(['new', 'in_review', 'contacted', 'closed', 'spam']),
  internal_notes: cleanMultiline(4000).optional().default(''),
});

export const reorderSchema = z.object({
  ids: z.array(z.coerce.number().int().positive()).max(200),
});

export const seoSchema = z.object({
  route: clean(200),
  title: clean(200).optional().default(''),
  description: clean(400).optional().default(''),
  canonical: z.union([z.string().url(), z.literal('')]).optional().default(''),
  robots: clean(60).optional().default('index,follow'),
  og_image_id: z.coerce.number().int().positive().nullable().optional(),
});

/** Flattens a ZodError into { field: message } for form rendering. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_form';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
