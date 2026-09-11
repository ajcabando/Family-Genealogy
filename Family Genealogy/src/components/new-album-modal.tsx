'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from './icons';

export function NewAlbumModal({ reunionId }: { reunionId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSending(true);
    const res = await fetch(`/api/reunions/${reunionId}/albums`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    });
    setSending(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || 'Could not create album');
      return;
    }
    setOpen(false);
    setName('');
    setDescription('');
    router.refresh();
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-ghost text-xs">
        <Icon name="plus" className="h-3.5 w-3.5" /> New album
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/40 p-4 animate-fade-in" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lift animate-fade-up" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-ink">New album</h2>
              <button onClick={() => setOpen(false)} className="rounded-lg p-2 text-inkSoft hover:bg-parchment"><Icon name="x" /></button>
            </div>
            <form onSubmit={submit} className="space-y-3">
              {error && <div className="rounded-xl bg-rust/10 px-4 py-3 text-sm text-rust">{error}</div>}
              <div>
                <label className="label">Album name</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Family Dinner" required />
              </div>
              <div>
                <label className="label">Description</label>
                <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <button type="submit" disabled={sending} className="btn-primary w-full">{sending ? 'Creating…' : 'Create album'}</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}