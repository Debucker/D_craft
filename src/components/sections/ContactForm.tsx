'use client';

import { useId, useRef, useState, type FormEvent } from 'react';

import { ArrowIcon } from '@/components/icons/Arrow';
import { Reveal } from '@/components/motion/Reveal';
import { site } from '@/content/site';

/**
 * INQUIRY FORM
 * -----------------------------------------------------------------------
 * The site is statically prerendered with no backend, so there is nothing to
 * POST to. Rather than fake a submission, this composes a pre-filled mail
 * draft and hands it to the visitor's mail client — the message genuinely
 * reaches the inbox, and no third-party form service sees anyone's address.
 *
 * To move to a real endpoint later, replace the body of `submit()` with your
 * fetch — the validation, error and status handling around it stay as they are.
 */

type Status = 'idle' | 'sending' | 'sent';

interface Fields {
  name: string;
  email: string;
  message: string;
}

type Errors = Partial<Record<keyof Fields, string>>;

const EMPTY: Fields = { name: '', email: '', message: '' };

/** Deliberately loose — the mail client is the real validator. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const FIELD_ORDER = ['name', 'email', 'message'] as const;

function validate(fields: Fields): Errors {
  const errors: Errors = {};
  if (!fields.name.trim()) errors.name = 'Please add your name.';
  if (!fields.email.trim()) errors.email = 'Please add your email.';
  else if (!EMAIL.test(fields.email.trim())) errors.email = 'That email does not look right.';
  if (!fields.message.trim()) errors.message = 'Please add a message.';
  return errors;
}

export function ContactForm() {
  const id = useId();
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>('idle');
  const formRef = useRef<HTMLFormElement>(null);

  const copy = site.contact.form;

  const set = (key: keyof Fields, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
    // Clear the error as soon as they start fixing it, not on the next submit.
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const found = validate(fields);
    setErrors(found);

    if (Object.keys(found).length > 0) {
      // Move focus to the first problem so keyboard and screen-reader users
      // land on it instead of hunting for the message.
      const firstKey = FIELD_ORDER.find((key) => found[key]);
      if (firstKey) {
        formRef.current
          ?.querySelector<HTMLElement>('[data-field="' + firstKey + '"]')
          ?.focus();
      }
      return;
    }

    setStatus('sending');

    const subject = 'Portfolio inquiry — ' + fields.name.trim();
    const body =
      fields.message.trim() + '\n\n—\n' + fields.name.trim() + '\n' + fields.email.trim();

    window.location.href =
      'mailto:' +
      site.email +
      '?subject=' +
      encodeURIComponent(subject) +
      '&body=' +
      encodeURIComponent(body);

    // The mail client opens in a separate context; this page never navigates,
    // so settle into a confirmed state and let them send another.
    window.setTimeout(() => {
      setStatus('sent');
      setFields(EMPTY);
    }, 900);
  }

  const fieldClass = (invalid: boolean) =>
    [
      'w-full rounded-card border bg-bg/60 px-4 py-3.5 text-base text-fg',
      'placeholder:text-faint transition-colors duration-300',
      'hover:border-line-strong focus:border-accent',
      invalid ? 'border-accent/70' : 'border-line',
    ].join(' ');

  return (
    <Reveal delay={0.1}>
      <form
        ref={formRef}
        onSubmit={submit}
        noValidate
        className="relative overflow-hidden rounded-card border border-line bg-surface p-7 sm:p-9"
      >
        {/* Background grid — two hairline gradients on one painted layer,
            masked so it fades out before it reaches the card edges. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              'linear-gradient(to right, var(--color-line-strong) 1px, transparent 1px), linear-gradient(to bottom, var(--color-line-strong) 1px, transparent 1px)',
            backgroundSize: '46px 46px',
            maskImage: 'radial-gradient(125% 100% at 50% 0%, #000 30%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(125% 100% at 50% 0%, #000 30%, transparent 100%)',
          }}
        />

        <div className="relative">
          <h3 className="font-display text-xl font-semibold text-fg">{copy.heading}</h3>
          <p className="mt-2 max-w-[46ch] text-sm text-muted">{copy.note}</p>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor={id + '-name'} className="eyebrow block">
                {copy.name.label}
              </label>
              <input
                id={id + '-name'}
                data-field="name"
                name="name"
                type="text"
                autoComplete="name"
                value={fields.name}
                onChange={(event) => set('name', event.target.value)}
                placeholder={copy.name.placeholder}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? id + '-name-error' : undefined}
                className={'mt-3 ' + fieldClass(Boolean(errors.name))}
              />
              {errors.name && (
                <p id={id + '-name-error'} className="mt-2 text-xs text-accent">
                  {errors.name}
                </p>
              )}
            </div>

            <div>
              <label htmlFor={id + '-email'} className="eyebrow block">
                {copy.email.label}
              </label>
              <input
                id={id + '-email'}
                data-field="email"
                name="email"
                type="email"
                autoComplete="email"
                value={fields.email}
                onChange={(event) => set('email', event.target.value)}
                placeholder={copy.email.placeholder}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? id + '-email-error' : undefined}
                className={'mt-3 ' + fieldClass(Boolean(errors.email))}
              />
              {errors.email && (
                <p id={id + '-email-error'} className="mt-2 text-xs text-accent">
                  {errors.email}
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label htmlFor={id + '-message'} className="eyebrow block">
                {copy.message.label}
              </label>
              <textarea
                id={id + '-message'}
                data-field="message"
                name="message"
                rows={5}
                value={fields.message}
                onChange={(event) => set('message', event.target.value)}
                placeholder={copy.message.placeholder}
                aria-invalid={Boolean(errors.message)}
                aria-describedby={errors.message ? id + '-message-error' : undefined}
                className={'mt-3 resize-y ' + fieldClass(Boolean(errors.message))}
              />
              {errors.message && (
                <p id={id + '-message-error'} className="mt-2 text-xs text-accent">
                  {errors.message}
                </p>
              )}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <button
              type="submit"
              disabled={status === 'sending'}
              className="group inline-flex items-center gap-2.5 rounded-pill bg-accent px-7 py-3.5 text-sm font-semibold text-bg transition-transform duration-300 ease-out-expo hover:-translate-y-0.5 disabled:opacity-60"
            >
              {status === 'sending' ? copy.sending : copy.submit}
              <ArrowIcon className="transition-transform duration-300 ease-out-expo group-hover:translate-x-1" />
            </button>

            {/* Polite, so it is announced without interrupting typing. */}
            <p role="status" aria-live="polite" className="max-w-[34ch] text-sm text-muted">
              {status === 'sent' ? copy.sent : ''}
            </p>
          </div>
        </div>
      </form>
    </Reveal>
  );
}
