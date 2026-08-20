'use client';

import { useState, type FormEvent } from 'react';

// Client components can't export `metadata` — the noindex directive for this
// route lives in a sibling `layout.tsx` instead, covering both /admin pages.

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        // A hard navigation, not router.push — the App Router's client-side
        // cache can serve the "not authenticated, redirect to login" RSC
        // response it fetched moments ago even after router.refresh(),
        // bouncing straight back here right after a successful login. A
        // full page load has no such cache to be stale.
        window.location.href = '/admin';
        return;
      }

      if (response.status === 503) {
        setError('No admin password is configured yet — set ADMIN_PASSWORD and redeploy.');
      } else {
        setError('Wrong password.');
      }
    } catch {
      setError('Could not reach the server. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-bg px-6">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-card border border-line bg-surface p-8"
      >
        <h1 className="font-display text-xl font-semibold text-fg">Admin</h1>
        <p className="mt-2 text-sm text-muted">Password-protected. Only you should have this.</p>

        <label htmlFor="admin-password" className="eyebrow mt-7 block">
          Password
        </label>
        <input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          autoFocus
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-3 w-full rounded-card border border-line bg-bg/60 px-4 py-3.5 text-base text-fg transition-colors duration-300 hover:border-line-strong focus:border-accent"
        />

        {error && (
          <p role="alert" className="mt-3 text-sm text-accent">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || password.length === 0}
          className="mt-7 w-full rounded-pill bg-accent px-6 py-3 text-sm font-semibold text-bg transition-transform duration-300 ease-out-expo hover:-translate-y-0.5 disabled:opacity-60"
        >
          {submitting ? 'Checking…' : 'Log in'}
        </button>
      </form>
    </div>
  );
}
