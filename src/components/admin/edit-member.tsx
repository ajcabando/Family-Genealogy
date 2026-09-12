'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MemberFormFields, memberFormFrom } from './member-form';
import type { MemberFormState } from './member-form';
import { Icon } from '../icons';
import { fullName } from '@/lib/utils';

export function EditMember({ id, initial }: { id: string; initial: Record<string, unknown> }) {
  const router = useRouter();
  const [form, setForm] = useState<MemberFormState>(memberFormFrom(initial));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleted, setDeleted] = useState(!!initial.deletedAt);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    const res = await fetch(`/api/members/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, gender: form.gender || 'UNKNOWN' }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || 'Save failed');
      return;
    }
    router.refresh();
  }

  async function toggleDelete() {
    if (deleted) {
      await fetch(`/api/members/${id}/restore`, { method: 'POST' });
      setDeleted(false);
    } else {
      if (!window.confirm('Remove this member from the tree? (Can be restored later.)')) return;
      await fetch(`/api/members/${id}`, { method: 'DELETE' });
      setDeleted(true);
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/members" className="inline-flex items-center gap-1 text-xs font-semibold text-goldDeep hover:text-gold">
          <Icon name="chevronLeft" className="h-3.5 w-3.5" /> Back to member management
        </Link>
        <button onClick={toggleDelete} className={deleted ? 'btn-ghost' : 'btn-danger'}>
          <Icon name={deleted ? 'check' : 'trash'} className="h-4 w-4" /> {deleted ? 'Restore member' : 'Remove member'}
        </button>
      </div>

      {deleted && (
        <div className="rounded-xl border border-rust/40 bg-rust/10 px-4 py-3 text-sm text-rust">
          This member is currently removed from the family tree. Restore them to bring their profile back.
        </div>
      )}

      <form onSubmit={save} className="card p-5">
        <h2 className="mb-4 font-display text-lg font-bold text-ink">Profile — {fullName(initial as { firstName?: string; lastName?: string })}</h2>
        {error && <div className="mb-4 rounded-xl bg-rust/10 px-4 py-3 text-sm text-rust">{error}</div>}
        <MemberFormFields form={form} setForm={setForm} />
        <div className="mt-4">
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save changes'}</button>
        </div>
      </form>
    </div>
  );
}