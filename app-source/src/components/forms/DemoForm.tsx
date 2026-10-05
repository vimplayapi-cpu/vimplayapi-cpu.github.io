'use client';

import Link from '@/components/ui/SiteLink';

import { useSearchParams } from 'next/navigation';
import { useRef, useState } from 'react';

import { CheckboxGroup, SelectField, SpamGuard, TextArea, TextField } from './Field';
import { Button } from '@/components/ui';
import { IS_STATIC, STATIC_FORM_ENDPOINT, buildMailto } from '@/lib/static-mode';
import { COUNTRIES, LAUNCH_PERIODS, PROJECT_TYPES } from '@/lib/validation/schemas';

type Status = 'idle' | 'submitting' | 'success' | 'error';

/**
 * Studio demo request form.
 *
 * Pre-selects a studio when arrived at via /demo?studio=<slug> — the link used
 * by each studio detail page's inquiry CTA — so the visitor does not have to
 * re-state what they were just looking at.
 */
export function DemoForm({
  studios,
  services,
  submitLabel,
  successTitle,
  successBody,
  successNote,
}: {
  studios: { slug: string; code: string; name: string }[];
  services: { slug: string; title: string }[];
  submitLabel: string;
  successTitle: string;
  successBody: string;
  successNote: string;
}) {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const renderedAt = useRef(Math.floor(Date.now() / 1000)).current;

  // Only honour the query param if it names a studio we actually publish.
  const requested = searchParams.get('studio') ?? '';
  const preselected = studios.some((s) => s.slug === requested) ? requested : '';

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('submitting');
    setErrors({});
    setMessage('');

    const form = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = Object.fromEntries(form.entries());
    // Checkbox groups need collecting explicitly — FormData.entries() keeps
    // only the last value for a repeated name.
    payload.required_services = form.getAll('required_services');

    // Static build: no /api available — see ContactForm for the rationale.
    if (IS_STATIC && !STATIC_FORM_ENDPOINT) {
      const { website: _hp, _t: _ts, ...visible } = payload as Record<string, string | string[]>;
      window.location.href = buildMailto('Studio demo request — Live Miracle', visible);
      setStatus('idle');
      return;
    }

    try {
      const res = await fetch(IS_STATIC ? STATIC_FORM_ENDPOINT : '/api/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);

      if (res.ok && json?.ok) {
        setStatus('success');
        formRef.current?.reset();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      setStatus('error');
      if (res.status === 429) {
        setMessage('Too many submissions from this connection. Please try again later.');
      } else if (json?.error?.details && typeof json.error.details === 'object') {
        setErrors(json.error.details as Record<string, string>);
        setMessage(json.error.message ?? 'Please check the highlighted fields.');
      } else {
        setMessage(json?.error?.message ?? 'Something went wrong. Please try again.');
      }
    } catch {
      setStatus('error');
      setMessage('Could not reach the server. Please check your connection and try again.');
    }
  }

  if (status === 'success') {
    return (
      <div className="panel frame-ticks p-10 text-center sm:p-16" role="status">
        <p className="font-display text-4xl font-semibold uppercase leading-none tracking-tight text-chalk sm:text-6xl">
          {successTitle}
        </p>
        <p className="mx-auto mt-6 max-w-lg font-mono text-tech-lg uppercase text-signal">
          {successBody}
        </p>
        <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-muted">{successNote}</p>
        <Button variant="secondary" className="mt-10" onClick={() => setStatus('idle')}>
          SUBMIT ANOTHER REQUEST
        </Button>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="relative">
      <SpamGuard renderedAt={renderedAt} />

      <fieldset className="border-t border-hairline pt-8">
        <legend className="tech-label-accent -ml-1 pr-4">01 — Who you are</legend>
        <div className="grid gap-6 sm:grid-cols-2">
          <TextField label="Name" name="name" required autoComplete="name" error={errors.name} />
          <TextField
            label="Company"
            name="company"
            autoComplete="organization"
            error={errors.company}
          />
          <TextField
            label="Business email"
            name="business_email"
            type="email"
            required
            autoComplete="email"
            error={errors.business_email}
          />
          <TextField
            label="Phone"
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            error={errors.phone}
          />
          <SelectField label="Country" name="country" options={COUNTRIES} error={errors.country} />
        </div>
      </fieldset>

      <fieldset className="mt-12 border-t border-hairline pt-8">
        <legend className="tech-label-accent -ml-1 pr-4">02 — What you need</legend>
        <div className="grid gap-6 sm:grid-cols-2">
          <SelectField
            label="Required studio"
            name="studio_slug"
            defaultValue={preselected}
            placeholder="No preference / not sure yet"
            options={studios.map((s) => ({ value: s.slug, label: `${s.code} — ${s.name}` }))}
            error={errors.studio_slug}
          />
          <TextField
            label="Number of users / operators"
            name="operators"
            placeholder="e.g. 12"
            error={errors.operators}
          />
          <SelectField
            label="Project type"
            name="project_type"
            options={PROJECT_TYPES}
            error={errors.project_type}
          />
          <SelectField
            label="Desired launch period"
            name="launch_period"
            options={LAUNCH_PERIODS}
            error={errors.launch_period}
          />
        </div>

        <CheckboxGroup
          label="Required services"
          name="required_services"
          options={services.map((s) => s.title)}
          className="mt-6"
          error={errors.required_services}
        />
      </fieldset>

      <fieldset className="mt-12 border-t border-hairline pt-8">
        <legend className="tech-label-accent -ml-1 pr-4">03 — Anything else</legend>
        <TextArea
          label="Message"
          name="message"
          rows={6}
          placeholder="Output format, operating hours, existing infrastructure, constraints — anything that helps us scope this accurately."
          error={errors.message}
        />
      </fieldset>

      <div aria-live="polite" className="mt-8 min-h-[1.5rem]">
        {status === 'error' && message && (
          <p className="border border-live/40 bg-live/10 px-4 py-3 font-mono text-tech uppercase text-live">
            {message}
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-6">
        <Button type="submit" disabled={status === 'submitting'} withArrow>
          {status === 'submitting' ? 'SENDING…' : submitLabel}
        </Button>
        <p className="max-w-sm text-xs text-muted">
          We use your details only to respond to this request. See our{' '}
          <Link href="/privacy" className="link-draw text-mist">
            privacy policy
          </Link>
          .
        </p>
      </div>
    </form>
  );
}
