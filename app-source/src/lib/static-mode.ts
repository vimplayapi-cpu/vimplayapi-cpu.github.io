/**
 * Static-export mode.
 *
 * The full application is a server app: the CMS, admin, forms and analytics all
 * need a Node runtime. `npm run build:static` produces a second, cut-down
 * artifact that can be hosted on a static host such as GitHub Pages.
 *
 * In that build the pages, design and content are all preserved — content is
 * read from SQLite at BUILD time and baked into HTML — but anything requiring a
 * live server is removed rather than left silently broken:
 *
 *   - /api/**            not emitted
 *   - /admin/**          not emitted
 *   - analytics beacon   disabled (nothing to post to)
 *   - contact + demo     fall back to a prefilled email, or to a form endpoint
 *                        if NEXT_PUBLIC_LM_FORM_ENDPOINT is configured
 *
 * The flag is NEXT_PUBLIC_ so it is inlined into the client bundle at build
 * time and can be read from client components.
 */
export const IS_STATIC = process.env.NEXT_PUBLIC_LM_STATIC === '1';

/**
 * Optional third-party form endpoint (Formspree, Basin, Netlify Forms, …).
 * When set, the static build posts to it instead of falling back to email.
 */
export const STATIC_FORM_ENDPOINT = process.env.NEXT_PUBLIC_LM_FORM_ENDPOINT ?? '';

/** Contact address used for the mailto fallback. */
export const STATIC_CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_LM_CONTACT_EMAIL || 'miracle@gmail.com';

/**
 * Builds a mailto: URL carrying the submitted fields, so a visitor on the
 * static site can still get in touch in one click and nothing is lost.
 */
export function buildMailto(
  subject: string,
  fields: Record<string, string | string[] | undefined>,
): string {
  const lines = Object.entries(fields)
    .filter(([, v]) => v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0))
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`);

  const body = lines.join('\n');
  return `mailto:${STATIC_CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
