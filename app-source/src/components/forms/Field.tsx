'use client';

import { useId, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

/**
 * Accessible form field primitives.
 *
 * Every control gets a real <label>, errors are wired through aria-describedby
 * and aria-invalid, and required fields are marked both visually and via the
 * `required` attribute. Error text is announced politely rather than stealing
 * focus mid-typing.
 */

interface BaseProps {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
}

function FieldShell({
  label,
  name,
  error,
  hint,
  required,
  className,
  id,
  children,
}: BaseProps & { id: string; children: ReactNode }) {
  return (
    <div className={cn('min-w-0', className)}>
      <label htmlFor={id} className="field-label">
        {label}
        {required && (
          <span aria-hidden className="ml-1 text-signal">
            *
          </span>
        )}
        {!required && <span className="ml-2 normal-case tracking-normal opacity-50">(optional)</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-2 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Each control supports both uncontrolled (`defaultValue`, used by the public
 * forms which read values off FormData) and controlled (`value` + `onChange`,
 * used by the admin editors which keep state in React) usage.
 */
export function TextField({
  type = 'text',
  autoComplete,
  placeholder,
  defaultValue,
  value,
  onChange,
  ...props
}: BaseProps & {
  type?: 'text' | 'email' | 'tel' | 'url' | 'number' | 'password';
  autoComplete?: string;
  placeholder?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
}) {
  const id = useId();
  const describedBy = props.error ? `${id}-error` : props.hint ? `${id}-hint` : undefined;

  return (
    <FieldShell {...props} id={id}>
      <input
        id={id}
        name={props.name}
        type={type}
        required={props.required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        {...(value !== undefined ? { value } : { defaultValue })}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        aria-invalid={props.error ? 'true' : undefined}
        aria-describedby={describedBy}
        className="field-input"
      />
    </FieldShell>
  );
}

export function TextArea({
  rows = 5,
  placeholder,
  defaultValue,
  value,
  onChange,
  ...props
}: BaseProps & {
  rows?: number;
  placeholder?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
}) {
  const id = useId();
  const describedBy = props.error ? `${id}-error` : props.hint ? `${id}-hint` : undefined;

  return (
    <FieldShell {...props} id={id}>
      <textarea
        id={id}
        name={props.name}
        rows={rows}
        required={props.required}
        placeholder={placeholder}
        {...(value !== undefined ? { value } : { defaultValue })}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        aria-invalid={props.error ? 'true' : undefined}
        aria-describedby={describedBy}
        className="field-input resize-y"
      />
    </FieldShell>
  );
}

export function SelectField({
  options,
  placeholder = 'Select…',
  defaultValue,
  value,
  onChange,
  ...props
}: BaseProps & {
  options: readonly string[] | { value: string; label: string }[];
  placeholder?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
}) {
  const id = useId();
  const describedBy = props.error ? `${id}-error` : props.hint ? `${id}-hint` : undefined;
  const normalised = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));

  return (
    <FieldShell {...props} id={id}>
      <select
        id={id}
        name={props.name}
        required={props.required}
        {...(value !== undefined ? { value } : { defaultValue: defaultValue ?? '' })}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        aria-invalid={props.error ? 'true' : undefined}
        aria-describedby={describedBy}
        className="field-input"
      >
        <option value="">{placeholder}</option>
        {normalised.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

/** Multi-select rendered as a checkbox group — clearer than a multiple select. */
export function CheckboxGroup({
  label,
  name,
  options,
  error,
  className,
}: {
  label: string;
  name: string;
  options: readonly string[];
  error?: string;
  className?: string;
}) {
  const id = useId();

  return (
    <fieldset className={cn('min-w-0', className)}>
      <legend className="field-label">{label}</legend>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {options.map((opt, i) => {
          // Explicit id/htmlFor rather than relying on the wrapping label
          // alone — implicit association is valid HTML but is handled less
          // consistently by screen readers.
          const optionId = `${id}-opt-${i}`;
          return (
            <label
              key={opt}
              htmlFor={optionId}
              className="group flex cursor-pointer items-center gap-3 border border-hairline bg-midnight/60 px-4 py-3 text-sm text-mist transition-colors hover:border-hairline-strong hover:text-chalk has-[:checked]:border-signal has-[:checked]:text-chalk"
            >
              <input
                id={optionId}
                type="checkbox"
                name={name}
                value={opt}
                className="h-4 w-4 shrink-0 accent-[#3DDCE8]"
              />
              {opt}
            </label>
          );
        })}
      </div>
      {error && (
        <p id={`${id}-error`} className="field-error" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}

/**
 * Honeypot + timing fields.
 *
 * The honeypot is hidden from sighted users AND from screen readers
 * (aria-hidden + tabIndex -1), so no real user can fill it in by accident;
 * only an automated form-filler will.
 */
export function SpamGuard({ renderedAt }: { renderedAt: number }) {
  return (
    <>
      <div aria-hidden className="absolute left-[-9999px] top-0 h-0 w-0 overflow-hidden">
        <label htmlFor="website-field">Website (leave this field empty)</label>
        <input
          id="website-field"
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>
      <input type="hidden" name="_t" value={renderedAt} />
    </>
  );
}
