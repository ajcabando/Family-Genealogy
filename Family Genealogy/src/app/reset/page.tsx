'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AuthShell } from '@/components/auth-shell';
import { Icon } from '@/components/icons';

export default function ResetPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}

function ResetForm() {
  const params = useSearchParams();
  const token = params.get('token') || '';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [devToken, setDevToken] = useState('');
  const [error, setError] = useState('');

  async function requestReset(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/auth/reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Request failed');
      else {
        setMessage(data.message || 'If that email exists, a reset link has been generated.');
        // MVP has no email provider — surface the reset link in the response.
        if (data.resetLink) setDevToken(data.resetLink);
      }
    } catch {
      setError('Network error — please try again.');
    }
  }

  async function doReset(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Reset failed');
      else setMessage('Password updated. You can now sign in.');
    } catch {
      setError('Network error — please try again.');
    }
  }

  return (
    <AuthShell title="Reset password">
      {message && <div className="mb-4 rounded-xl bg-sage/10 px-4 py-3 text-sm text-sage">{message}</div>}
      {error && <div className="mb-4 rounded-xl bg-rust/10 px-4 py-3 text-sm text-rust">{error}</div>}

      {token ? (
        <form onSubmit={doReset} className="space-y-4">
          <div>
            <label className="label" htmlFor="pw">New password</label>
            <input id="pw" type="password" minLength={8} required className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary w-full">Update password</button>
        </form>
      ) : (
        <form onSubmit={requestReset} className="space-y-4">
          <div>
            <label className="label" htmlFor="email">Account email</label>
            <input id="email" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary w-full">Send reset link</button>
        </form>
      )}

      {devToken && (
        <div className="mt-4 rounded-xl bg-parchment px-4 py-3 text-xs text-inkSoft">
          <p className="mb-1 font-semibold">No email service is configured in this MVP — your reset link:</p>
          <Link href={devToken} className="break-all font-mono text-goldDeep underline">{devToken}</Link>
        </div>
      )}

      <div className="mt-4 text-center text-sm">
        <Link href="/login" className="font-semibold text-goldDeep hover:text-gold">Back to sign in</Link>
      </div>
    </AuthShell>
  );
}