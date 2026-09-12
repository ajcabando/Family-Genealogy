'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AuthShell } from '@/components/auth-shell';
import { Icon } from '@/components/icons';

export default function RegisterPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <AuthShell title="Request received">
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sage/15 text-sage">
            <Icon name="check" className="h-7 w-7" />
          </div>
          <p className="text-sm text-inkSoft">
            Your access request has been submitted. An administrator will approve your account before you can sign in.
          </p>
          <Link href="/login" className="btn-primary mt-2">Back to sign in</Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Request access">
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <div className="rounded-xl bg-rust/10 px-4 py-3 text-sm text-rust">{error}</div>}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="firstName">First name</label>
            <input id="firstName" className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          </div>
          <div>
            <label className="label" htmlFor="lastName">Last name</label>
            <input id="lastName" className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" minLength={8} className="input" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
          <p className="mt-1 text-xs text-inkSoft">At least 8 characters. This is a private family system — accounts are approved by an administrator.</p>
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Submitting…' : 'Submit request'}
        </button>
      </form>
      <div className="mt-4 text-center text-sm">
        Already have access?{' '}
        <Link href="/login" className="font-semibold text-goldDeep hover:text-gold">Sign in</Link>
      </div>
    </AuthShell>
  );
}