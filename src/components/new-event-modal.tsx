'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from './icons';

export function NewEventModal({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', eventDate: '', eventType: 'MILESTONE', description: '' });
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const router = useRouter();

  if (!isAdmin) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSending(true);
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || 'Could not add event');
        return;
      }
    } catch {
      setError('Network error — please try again.');
      return;
    } finally {
      setSending(false);
    }
    setOpen(false);
    setForm({ title: '', eventDate: '', eventType: 'MILESTONE', description: '' });
    router.refresh();
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary">
        <Icon name="plus" className="h-4 w-4" /> Add milestone
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/40 p-4 animate-fade-in" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lift animate-fade-up" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-ink">Add a family milestone</h2>
              <button onClick={() => setOpen(false)} className="rounded-lg p-2 text-inkSoft hover:bg-parchment"><Icon name="x" /></button>
            </div>
            <form onSubmit={submit} className="space-y-4">
              {error && <div className="rounded-xl bg-rust/10 px-4 py-3 text-sm text-rust">{error}</div>}
              <div>
                <label className="label">Title</label>
                <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Family moved to Cebu" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Date</label>
                  <input type="date" className="input" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Type</label>
                  <select className="input" value={form.eventType} onChange={(e) => setForm({ ...form, eventType: e.target.value })}>
                    <option value="MILESTONE">Milestone</option>
                    <option value="MOVE">Move</option>
                    <option value="REUNION">Reunion</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <button type="submit" disabled={sending} className="btn-primary w-full">{sending ? 'Adding…' : 'Add to timeline'}</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}