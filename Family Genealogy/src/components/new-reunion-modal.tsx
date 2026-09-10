'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from './icons';

export function NewReunionModal({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', date: '', location: '', description: '' });
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const router = useRouter();

  if (!isAdmin) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSending(true);
    const res = await fetch('/api/reunions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) {
      setError(data.error || 'Could not create reunion');
      return;
    }
    setOpen(false);
    router.push(`/reunions/${data.id}`);
    router.refresh();
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary">
        <Icon name="plus" className="h-4 w-4" /> New reunion
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/40 p-4 animate-fade-in" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lift animate-fade-up" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-ink">Create a reunion</h2>
              <button onClick={() => setOpen(false)} className="rounded-lg p-2 text-inkSoft hover:bg-parchment"><Icon name="x" /></button>
            </div>
            <form onSubmit={submit} className="space-y-4">
              {error && <div className="rounded-xl bg-rust/10 px-4 py-3 text-sm text-rust">{error}</div>}
              <div>
                <label className="label">Event name</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. 2027 Family Reunion" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Date</label>
                  <input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Location</label>
                  <input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Cebu City" />
                </div>
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <button type="submit" disabled={sending} className="btn-primary w-full">{sending ? 'Creating…' : 'Create reunion'}</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}