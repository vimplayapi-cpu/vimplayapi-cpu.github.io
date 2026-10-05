'use client';

import Link from '@/components/ui/SiteLink';

import { useRef, useState } from 'react';

import { CheckboxGroup, SelectField, SpamGuard, TextArea, TextField } from './Field';
import { Button } from '@/components/ui';
import { IS_STATIC, STATIC_FORM_ENDPOINT, buildMailto } from '@/lib/static-mode';
import { COUNTRIES, PROJECT_TYPES } from '@/lib/validation/schemas';

type Status = 'idle' | 'submitting' | 'success' | 'error';

/**
 * Public contact inquiry form.
 *
 * Submits JSON to /api/contact, which re-validates everything server-side.
 * Field-level errors returned by the server are rendered inline; the summary
 * is announced through a live region so a screen-reader user hears the outcome
 * without hunting for it.
 */
export function ContactForm({
  services,
  submitLabel,
  successTitle,
  successBody,
}: {
  services: { slug: string; title: string }[];
  submitLabel: string;
  successTitle: string;
  successBody: string;
}) {
  const [status, setStatus] = useState<Status>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  // Captured once at mount; the server compares it against submission time.
  const renderedAt = useRef(Math.floor(Date.now() / 1000)).current;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('submitting');
    setErrors({});
    setMessage('');

    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());

    // Static build: there is no /api to post to. Prefer a configured form
    // endpoint; otherwise hand the visitor a prefilled email so the enquiry
    // still reaches us rather than failing silently.
    if (IS_STATIC && !STATIC_FORM_ENDPOINT) {
      const { website: _hp, _t: _ts, ...visible } = payload as Record<string, string>;
      window.location.href = buildMailto('Website inquiry — Live Miracle', visible);
      setStatus('idle');
      return;
    }

    try {
      const res = await fetch(IS_STATIC ? STATIC_FORM_ENDPOINT : '/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);

      if (res.ok && json?.ok) {
        setStatus('success');
        formRef.current?.reset();
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
      <div className="panel frame-ticks p-10 text-center sm:p-14" role="status">
        <p className="font-display text-3xl font-semibold uppercase tracking-tight text-chalk sm:text-4xl">
          {successTitle}
        </p>
        <p className="mx-auto mt-5 max-w-md font-mono text-tech uppercase text-mist">{successBody}</p>
        <Button
          variant="secondary"
          className="mt-10"
          onClick={() => setStatus('idle')}
        >
          SEND ANOTHER INQUIRY
        </Button>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="relative">
      <SpamGuard renderedAt={renderedAt} />

      <div className="grid gap-6 sm:grid-cols-2">
        <TextField
          label="Full name"
          name="full_name"
          required
          autoComplete="name"
          error={errors.full_name}
        />
        <TextField label="Company" name="company" autoComplete="organization" error={errors.company} />
        <TextField
          label="Email"
          name="email"
          type="email"
          required
          autoComplete="email"
          error={errors.email}
        />
        <TextField label="Phone" name="phone" type="tel" autoComplete="tel" error={errors.phone} />
        <SelectField label="Country" name="country" options={COUNTRIES} error={errors.country} />
        <SelectField
          label="Service interest"
          name="service_interest"
          options={services.map((s) => ({ value: s.title, label: s.title }))}
          error={errors.service_interest}
        />
        <SelectField
          label="Project type"
          name="project_type"
          options={PROJECT_TYPES}
          className="sm:col-span-2"
          error={errors.project_type}
        />
        <TextArea
          label="Message"
          name="message"
          required
          rows={6}
          className="sm:col-span-2"
          placeholder="Tell us about the production you need to run — output format, scale, timeline and anything already decided."
          error={errors.message}
        />
      </div>

      {/* Status region — announced to assistive technology */}
      <div aria-live="polite" className="mt-6 min-h-[1.5rem]">
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
        <p className="text-xs text-muted">
          We use your details only to respond to this inquiry. See our{' '}
          <Link href="/privacy" className="link-draw text-mist">
            privacy policy
          </Link>
          .
        </p>
      </div>
    </form>
  );
}
