import Link from '@/components/ui/SiteLink';
import type { ComponentProps, ReactNode } from 'react';

import { cn } from '@/lib/cn';

/**
 * Shared UI primitives.
 *
 * The visual language is deliberately square-cornered and hairline-ruled — the
 * reference is broadcast equipment and control surfaces, not rounded cards.
 */

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
};

export function ButtonLink({
  href,
  children,
  variant = 'primary',
  className,
  withArrow = true,
  ...rest
}: {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  className?: string;
  withArrow?: boolean;
} & Omit<ComponentProps<typeof Link>, 'href' | 'className'>) {
  return (
    <Link href={href} className={cn('btn group', VARIANT[variant], className)} {...rest}>
      {children}
      {withArrow && <Arrow />}
    </Link>
  );
}

export function Button({
  children,
  variant = 'primary',
  className,
  withArrow = false,
  ...rest
}: ComponentProps<'button'> & { variant?: ButtonVariant; withArrow?: boolean }) {
  return (
    <button className={cn('btn group', VARIANT[variant], className)} {...rest}>
      {children}
      {withArrow && <Arrow />}
    </button>
  );
}

/** Arrow that tracks forward on hover — a small signal of direction. */
export function Arrow({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="8"
      viewBox="0 0 16 8"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      className={cn(
        'transition-transform duration-500 ease-cinematic group-hover:translate-x-1.5',
        className,
      )}
    >
      <path d="M0 4h14M10.5 0.5L14 4l-3.5 3.5" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Section scaffolding
// ---------------------------------------------------------------------------

/** Monospace eyebrow with a leading rule — the technical annotation voice. */
export function Eyebrow({
  children,
  className,
  accent = false,
}: {
  children: ReactNode;
  className?: string;
  accent?: boolean;
}) {
  return (
    <p className={cn('flex items-center gap-3', className)}>
      <span
        aria-hidden
        className="block h-px w-8 shrink-0"
        style={{ backgroundColor: accent ? 'var(--studio-accent)' : 'currentColor', opacity: 0.5 }}
      />
      <span className={accent ? 'tech-label-accent' : 'tech-label'}>{children}</span>
    </p>
  );
}

/**
 * Headline that preserves authored line breaks. CMS copy uses newlines to
 * control where a display headline turns, which matters at this type size.
 */
export function Headline({
  children,
  className,
  as: Tag = 'h2',
  size = 'lg',
}: {
  children: string;
  className?: string;
  as?: 'h1' | 'h2' | 'h3';
  size?: 'xl' | 'lg' | 'md' | 'sm';
}) {
  const sizes = {
    xl: 'text-display-xl',
    lg: 'text-display-lg',
    md: 'text-display-md',
    sm: 'text-display-sm',
  } as const;

  const lines = children.split('\n');
  return (
    <Tag className={cn(sizes[size], 'uppercase', className)}>
      {lines.map((line, i) => (
        <span key={i} className="block">
          {line}
        </span>
      ))}
    </Tag>
  );
}

export function SectionIntro({
  eyebrow,
  headline,
  body,
  className,
  as = 'h2',
  size = 'lg',
  align = 'left',
}: {
  eyebrow?: string;
  headline: string;
  body?: string;
  className?: string;
  as?: 'h1' | 'h2' | 'h3';
  size?: 'xl' | 'lg' | 'md' | 'sm';
  align?: 'left' | 'center';
}) {
  return (
    <div className={cn(align === 'center' && 'mx-auto max-w-3xl text-center', className)}>
      {eyebrow && (
        <Eyebrow className={cn('mb-7', align === 'center' && 'justify-center')}>{eyebrow}</Eyebrow>
      )}
      <Headline as={as} size={size}>
        {headline}
      </Headline>
      {body && (
        <p
          className={cn(
            'mt-7 max-w-prose text-base leading-relaxed text-mist sm:text-lg',
            align === 'center' && 'mx-auto',
          )}
        >
          {body}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Content states
// ---------------------------------------------------------------------------

/**
 * Renders an unfilled CMS field.
 *
 * Placeholder values are seeded in the [BRACKETED] form required by the brief.
 * Rather than printing that raw string to visitors, we detect it and render a
 * quiet, clearly-unfinished marker — visible to an administrator reviewing the
 * site, unobtrusive to a visitor.
 */
export function isPlaceholder(value: string | null | undefined): boolean {
  return !!value && /^\[.*\]$/.test(value.trim());
}

export function CmsValue({
  value,
  fallback = '—',
  className,
}: {
  value: string | null | undefined;
  fallback?: string;
  className?: string;
}) {
  if (!value || value.trim() === '') {
    return <span className={cn('text-muted/60', className)}>{fallback}</span>;
  }
  if (isPlaceholder(value)) {
    return (
      <span
        className={cn('font-mono text-tech-sm uppercase text-standby/80', className)}
        title="This value has not been set in the content management system yet."
      >
        {value.replace(/^\[|\]$/g, '')}
      </span>
    );
  }
  return <span className={className}>{value}</span>;
}

/** Empty state used wherever a CMS collection has no rows yet. */
export function EmptyState({
  title,
  body,
  action,
  className,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('panel frame-ticks px-8 py-16 text-center', className)}>
      <p className="tech-label">{title}</p>
      {body && <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted">{body}</p>}
      {action && <div className="mt-8">{action}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

const STATUS_TONE: Record<string, string> = {
  available: 'text-ready border-ready/40 bg-ready/10',
  limited: 'text-standby border-standby/40 bg-standby/10',
  in_production: 'text-signal border-signal/40 bg-signal/10',
  unavailable: 'text-muted border-hairline bg-graphite/60',
};

export function StatusPill({
  status,
  label,
  className,
}: {
  status: string;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 border px-3 py-1.5 font-mono text-tech-sm uppercase',
        STATUS_TONE[status] ?? STATUS_TONE.unavailable,
        className,
      )}
    >
      <span aria-hidden className="block h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

/** Ordinal marker, e.g. 03 / 10 */
export function Index({
  value,
  total,
  className,
}: {
  value: number;
  total?: number;
  className?: string;
}) {
  return (
    <span className={cn('tech-index', className)}>
      {String(value).padStart(2, '0')}
      {total !== undefined && <span className="text-muted/50"> / {String(total).padStart(2, '0')}</span>}
    </span>
  );
}

/** Prose block that respects authored paragraph breaks. */
export function Prose({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn('space-y-5', className)}>
      {text
        .split(/\n{2,}/)
        .filter(Boolean)
        .map((para, i) => (
          <p key={i} className="max-w-prose text-base leading-relaxed text-mist">
            {para}
          </p>
        ))}
    </div>
  );
}
