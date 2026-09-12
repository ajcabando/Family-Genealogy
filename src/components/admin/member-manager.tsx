'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '../icons';
import { MemberFormFields, emptyMemberForm, memberFormFrom } from './member-form';
import type { MemberFormState } from './member-form';
import { cn, fullName, yearsRange, photoUrl } from '@/lib/utils';

export type ManagedMember = {
  id: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  maidenName?: string | null;
  nickname?: string | null;
  gender: string;
  birthDate?: string | null;
  birthPlace?: string | null;
  deathDate?: string | null;
  deathPlace?: string | null;
  biography?: string | null;
  occupation?: string | null;
  location?: string | null;
  branch?: string | null;
  deletedAt?: string | null;
  profilePhoto?: { thumbPath?: string | null } | null;
};

export function MemberManager({ members }: { members: ManagedMember[] }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; id?: string } | null>(null);
  const [form, setForm] = useState<MemberFormState>(emptyMemberForm());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [mergeSel, setMergeSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = members;
    if (!showDeleted) list = list.filter((m) => !m.deletedAt);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((m) => fullName(m).toLowerCase().includes(q) || (m.branch || '').toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));
  }, [members, query, showDeleted]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    const url = modal?.mode === 'edit' ? `/api/members/${modal.id}` : '/api/members';
    const method = modal?.mode === 'edit' ? 'PATCH' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, gender: form.gender || 'UNKNOWN' }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || 'Save failed');
      return;
    }
    setModal(null);
    router.refresh();
  }

  async function del(id: string) {
    if (!window.confirm('Remove this member from the tree? (Can be restored later.)')) return;
    setBusy(id);
    await fetch(`/api/members/${id}`, { method: 'DELETE' });
    setBusy(null);
    router.refresh();
  }

  async function restore(id: string) {
    setBusy(id);
    await fetch(`/api/members/${id}/restore`, { method: 'POST' });
    setBusy(null);
    router.refresh();
  }

  async function merge() {
    const ids = [...mergeSel];
    if (ids.length !== 2) return;
    if (!window.confirm(`Merge these two records into "${fullName(members.find((m) => m.id === ids[0]))}"? Relationships and photos will be moved.`)) return;
    setBusy('merge');
    const res = await fetch('/api/members/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keepId: ids[0], mergeId: ids[1] }),
    });
    setBusy(null);
    if (res.ok) {
      setMergeSel(new Set());
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      window.alert(d.error || 'Merge failed');
    }
  }

  const toggleMerge = (id: string) => {
    setMergeSel((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        if (next.size >= 2) next.delete([...next][0]);
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Icon name="search" className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-inkSoft" />
          <input className="input pl-10" placeholder="Search members…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm text-inkSoft">
          <input type="checkbox" checked={showDeleted} onChange={(e) => setShowDeleted(e.target.checked)} className="h-4 w-4 rounded accent-goldDeep" />
          Show deleted
        </label>
        <button
          onClick={() => {
            setForm(emptyMemberForm());
            setError('');
            setModal({ mode: 'add' });
          }}
          className="btn-primary"
        >
          <Icon name="plus" className="h-4 w-4" /> Add member
        </button>
      </div>

      {mergeSel.size > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-gold/40 bg-gold/5 px-4 py-2.5 text-sm">
          <span className="text-goldDeep">{mergeSel.size} selected — merging keeps the first record&apos;s profile and moves relationships/photos.</span>
          <button onClick={merge} disabled={mergeSel.size !== 2 || busy === 'merge'} className="btn-gold text-xs">
            {busy === 'merge' ? 'Merging…' : 'Merge records'}
          </button>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-line/60 text-[11px] uppercase tracking-wide text-inkSoft">
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Years</th>
              <th className="px-4 py-3 font-semibold">Branch</th>
              <th className="px-4 py-3 font-semibold">Location</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/40">
            {filtered.map((m) => (
              <tr key={m.id} className={cn('transition hover:bg-parchment/40', m.deletedAt && 'opacity-50')}>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={mergeSel.has(m.id)}
                      onChange={() => toggleMerge(m.id)}
                      className="h-4 w-4 rounded border-line accent-goldDeep"
                      title="Select for merge"
                    />
                    <img
                      src={photoUrl(m.profilePhoto)}
                      alt=""
                      onError={(ev) => ((ev.target as HTMLImageElement).style.display = 'none')}
                      className={cn('h-9 w-9 rounded-full border border-line object-cover', m.deathDate ? 'grayscale' : '')}
                    />
                    <Link href={`/family/${m.id}`} className="font-semibold text-ink hover:text-goldDeep">
                      {fullName(m)}
                    </Link>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-inkSoft">{yearsRange(m.birthDate, m.deathDate)}</td>
                <td className="px-4 py-2.5 text-inkSoft">{m.branch || '—'}</td>
                <td className="px-4 py-2.5 text-inkSoft">{m.location || '—'}</td>
                <td className="px-4 py-2.5">
                  {m.deletedAt ? <span className="badge-red">deleted</span> : m.deathDate ? <span className="badge-neutral">deceased</span> : <span className="badge-green">living</span>}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex justify-end gap-1">
                    {m.deletedAt ? (
                      <button onClick={() => restore(m.id)} disabled={busy === m.id} className="rounded-lg p-2 text-sage transition hover:bg-sage/10" title="Restore">
                        <Icon name="check" className="h-4 w-4" />
                      </button>
                    ) : (
                      <>
                        <Link href={`/admin/members/${m.id}`} className="rounded-lg p-2 text-inkSoft transition hover:bg-parchment" title="Edit">
                          <Icon name="edit" className="h-4 w-4" />
                        </Link>
                        <button onClick={() => del(m.id)} disabled={busy === m.id} className="rounded-lg p-2 text-inkSoft transition hover:bg-rust/10 hover:text-rust" title="Delete">
                          <Icon name="trash" className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-inkSoft">No members found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/40 p-4 animate-fade-in" onClick={() => setModal(null)}>
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-lift animate-fade-up" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-ink">{modal.mode === 'edit' ? 'Edit member' : 'Add family member'}</h2>
              <button onClick={() => setModal(null)} className="rounded-lg p-2 text-inkSoft hover:bg-parchment"><Icon name="x" /></button>
            </div>
            {error && <div className="mb-4 rounded-xl bg-rust/10 px-4 py-3 text-sm text-rust">{error}</div>}
            <form onSubmit={save} className="space-y-4">
              <MemberFormFields form={form} setForm={setForm} />
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving…' : 'Save member'}</button>
                <button type="button" onClick={() => setModal(null)} className="btn-ghost">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}