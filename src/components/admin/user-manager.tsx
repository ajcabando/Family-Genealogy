'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '../icons';
import { cn, formatRelative } from '@/lib/utils';

type ManagedUser = {
  id: string;
  email: string;
  role: 'ADMIN' | 'MEMBER';
  status: string;
  memberName?: string | null;
  memberId?: string | null;
  createdAt: string;
};

export function UserManager({ users, members }: { users: ManagedUser[]; members: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ email: '', password: '', role: 'MEMBER', memberId: '' });
  const [resetPw, setResetPw] = useState<string | null>(null);
  const [newPw, setNewPw] = useState('');

  async function act(id: string, body: Record<string, unknown>) {
    setBusy(id);
    setError('');
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setBusy(null);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || 'Action failed');
      return;
    }
    router.refresh();
  }

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy('add');
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addForm),
    });
    setBusy(null);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || 'Could not add user');
      return;
    }
    setAddOpen(false);
    setAddForm({ email: '', password: '', role: 'MEMBER', memberId: '' });
    router.refresh();
  }

  async function resetPassword(id: string) {
    if (!newPw || newPw.length < 8) return;
    setBusy(id);
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPw }),
    });
    setBusy(null);
    setResetPw(null);
    setNewPw('');
    if (res.ok) router.refresh();
  }

  return (
    <div>
      {error && <div className="mb-4 rounded-xl bg-rust/10 px-4 py-3 text-sm text-rust">{error}</div>}

      <div className="mb-4 flex justify-end">
        <button onClick={() => setAddOpen(true)} className="btn-primary">
          <Icon name="userPlus" className="h-4 w-4" /> Add user
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-line/60 text-[11px] uppercase tracking-wide text-inkSoft">
              <th className="px-4 py-3 font-semibold">User</th>
              <th className="px-4 py-3 font-semibold">Family member</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Joined</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/40">
            {users.map((u) => (
              <tr key={u.id} className={cn('transition hover:bg-parchment/40', u.status !== 'ACTIVE' && 'opacity-60')}>
                <td className="px-4 py-2.5 font-semibold text-ink">{u.email}</td>
                <td className="px-4 py-2.5 text-inkSoft">
                  {u.memberId ? (
                    <select
                      defaultValue={u.memberId}
                      onChange={(e) => e.target.value && act(u.id, { familyMemberId: e.target.value })}
                      className="rounded-lg border border-line bg-white px-2 py-1 text-xs"
                    >
                      <option value={u.memberId}>{u.memberName}</option>
                      {members.filter((m) => m.id !== u.memberId).map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  ) : (
                    <select
                      defaultValue=""
                      onChange={(e) => e.target.value && act(u.id, { familyMemberId: e.target.value })}
                      className="rounded-lg border border-line bg-white px-2 py-1 text-xs text-inkSoft"
                    >
                      <option value="">Link to member…</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <select
                    value={u.role}
                    onChange={(e) => act(u.id, { role: e.target.value })}
                    disabled={busy === u.id}
                    className="rounded-lg border border-line bg-white px-2 py-1 text-xs font-semibold"
                  >
                    <option value="MEMBER">Member</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </td>
                <td className="px-4 py-2.5">
                  {u.status === 'PENDING' && <span className="badge-gold">pending</span>}
                  {u.status === 'ACTIVE' && <span className="badge-green">active</span>}
                  {u.status === 'DISABLED' && <span className="badge-red">disabled</span>}
                </td>
                <td className="px-4 py-2.5 text-inkSoft">{formatRelative(u.createdAt)}</td>
                <td className="px-4 py-2.5">
                  <div className="flex justify-end gap-1">
                    {u.status === 'PENDING' && (
                      <button onClick={() => act(u.id, { status: 'ACTIVE' })} disabled={busy === u.id} className="btn-primary px-3 py-1.5 text-xs">
                        Approve
                      </button>
                    )}
                    {u.status === 'ACTIVE' && (
                      <button onClick={() => act(u.id, { status: 'DISABLED' })} disabled={busy === u.id} className="rounded-lg p-2 text-inkSoft transition hover:bg-rust/10 hover:text-rust" title="Disable">
                        <Icon name="x" className="h-4 w-4" />
                      </button>
                    )}
                    {u.status === 'DISABLED' && (
                      <button onClick={() => act(u.id, { status: 'ACTIVE' })} disabled={busy === u.id} className="rounded-lg p-2 text-sage transition hover:bg-sage/10" title="Enable">
                        <Icon name="check" className="h-4 w-4" />
                      </button>
                    )}
                    {resetPw === u.id ? (
                      <span className="flex items-center gap-1">
                        <input
                          type="password"
                          className="input w-32 py-1 text-xs"
                          placeholder="New password"
                          value={newPw}
                          onChange={(e) => setNewPw(e.target.value)}
                        />
                        <button onClick={() => resetPassword(u.id)} className="btn-primary px-2 py-1 text-xs">Set</button>
                      </span>
                    ) : (
                      <button onClick={() => setResetPw(u.id)} disabled={busy === u.id} className="rounded-lg p-2 text-inkSoft transition hover:bg-parchment" title="Reset password">
                        <Icon name="edit" className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {addOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/40 p-4 animate-fade-in" onClick={() => setAddOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lift animate-fade-up" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-ink">Add user</h2>
              <button onClick={() => setAddOpen(false)} className="rounded-lg p-2 text-inkSoft hover:bg-parchment"><Icon name="x" /></button>
            </div>
            <form onSubmit={addUser} className="space-y-4">
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} required />
              </div>
              <div>
                <label className="label">Password</label>
                <input type="password" minLength={8} className="input" value={addForm.password} onChange={(e) => setAddForm({ ...addForm, password: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Role</label>
                  <select className="input" value={addForm.role} onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}>
                    <option value="MEMBER">Member</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="label">Family member</label>
                  <select className="input" value={addForm.memberId} onChange={(e) => setAddForm({ ...addForm, memberId: e.target.value })}>
                    <option value="">None</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button type="submit" disabled={busy === 'add'} className="btn-primary w-full">{busy === 'add' ? 'Adding…' : 'Add user'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}