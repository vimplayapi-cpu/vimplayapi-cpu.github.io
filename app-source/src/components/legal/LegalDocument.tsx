import { Reveal } from '@/components/motion/Reveal';
import { Headline } from '@/components/ui';

/**
 * Renders a legal document from CMS copy.
 *
 * The body format is a deliberately tiny subset — `## ` headings and blank-line
 * separated paragraphs — parsed into real elements rather than injected as
 * HTML. Nothing from the database is ever passed to dangerouslySetInnerHTML,
 * so a compromised CMS field cannot become stored XSS.
 */
export function LegalDocument({
  title,
  body,
  reviewNotice,
  updatedAt,
}: {
  title: string;
  body: string;
  reviewNotice?: string;
  updatedAt?: number;
}) {
  const blocks = parse(body);

  return (
    <>
      <section className="border-b border-hairline pb-14 pt-40 sm:pt-48">
        <div className="shell">
          <Reveal>
            <Headline as="h1" size="md" className="max-w-3xl text-chalk">
              {title}
            </Headline>
            {updatedAt && (
              <p className="mt-6 font-mono text-tech uppercase text-muted">
                Last updated{' '}
                {new Date(updatedAt * 1000).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            )}
          </Reveal>
        </div>
      </section>

      <section className="section">
        <div className="shell max-w-3xl">
          {reviewNotice && (
            <Reveal>
              <aside
                role="note"
                className="mb-14 border border-standby/35 bg-standby/[0.07] p-6"
              >
                <p className="tech-label mb-3 text-standby">Pending legal review</p>
                <p className="text-sm leading-relaxed text-mist">{reviewNotice}</p>
              </aside>
            </Reveal>
          )}

          <div className="space-y-8">
            {blocks.map((b, i) =>
              b.type === 'heading' ? (
                <Reveal key={i}>
                  <h2 className="pt-6 font-display text-xl font-semibold uppercase tracking-tight text-chalk">
                    {b.text}
                  </h2>
                </Reveal>
              ) : (
                <Reveal key={i}>
                  <p className="text-base leading-relaxed text-mist">{b.text}</p>
                </Reveal>
              ),
            )}
          </div>

          <p className="mt-16 border-t border-hairline pt-8 text-xs leading-relaxed text-muted">
            This document is maintained in the Live Miracle content management system. Bracketed
            values indicate information the operating entity has still to supply.
          </p>
        </div>
      </section>
    </>
  );
}

interface Block {
  type: 'heading' | 'paragraph';
  text: string;
}

function parse(body: string): Block[] {
  return body
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) =>
      chunk.startsWith('## ')
        ? { type: 'heading' as const, text: chunk.slice(3).trim() }
        // Single newlines inside a paragraph are soft wraps, not breaks.
        : { type: 'paragraph' as const, text: chunk.replace(/\n/g, ' ') },
    );
}
