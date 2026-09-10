'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '../icons';
import { fullName } from '@/lib/utils';

type Member = { id: string; firstName: string; lastName: string };
type Rel = { id: string; personId: string; relatedPersonId: string; type: string; status: string; startDate?: string | null };

const REL_TYPES = ['PARENT', 'SPOUSE', 'SIBLING', 'ADOPTED_PARENT', 'ADOPTED_CHILD', 'STEP_PARENT', 'STEP_CHILD'];

export function RelationshipManager({ memberId, members, relationships }: { memberId: string; members: Member[]; relationships: Rel[] }) {
  const router = useRouter();
  const [type, setType] = useState('PARENT');
  const [otherId, setOtherId] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const nameOf = (id: string) => {
    const m = members.find((x) => x.id === id);
    return m ? fullName(m) : id;
  };

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!otherId) return;
    setSaving(true);
    // Store direction as (personId, relatedPersonId, type) with personId = this member
    // for parent-like types; for SPOUSE/SIBLING direction is symmetric.
    const res = await fetch(`/api/members/${memberId}/relationships`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, otherId }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || 'Could not add relationship');
      return;
    }
    setOtherId('');
    router.refresh();
  }

  async function remove(id: string) {
    if (!window.confirm('Remove this relationship?')) return;
    await fetch(`/api/relationships/${id}`, { method: 'DELETE' });
    router.refresh();
  }

  const describe = (r: Rel) => {
    const other = r.personId === memberId ? r.relatedPersonId : r.personId;
    const label = r.type.replace(/_/g, ' ').toLowerCase();
    const isParentLike = ['PARENT', 'ADOPTED_PARENT', 'STEP_PARENT'].includes(r.type);
    const isChildLike = ['ADOPTED_CHILD', 'STEP_CHILD'].includes(r.type);
    if (r.type === 'SPOUSE') return `${nameOf(other)} (spouse)`;
    if (isParentLike) return `${nameOf(other)} is ${label} of ${nameOf(memberId)}`;
    if (isChildLike) return `${nameOf(other)} is ${label} of ${nameOf(memberId)}`;
    return `${nameOf(other)} (${label})`;
  };

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="label">Relationship type</label>
          <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
            {REL_TYPES.map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, ' ').toLowerCase()}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="label">With</label>
          <select className="input" value={otherId} onChange={(e) => setOtherId(e.target.value)}>
            <option value="">Select a member…</option>
            {members.filter((m) => m.id !== memberId).map((m) => (
              <option key={m.id} value={m.id}>{fullName(m)}</option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={saving || !otherId} className="btn-primary">Add relationship</button>
      </form>
      {error && <div className="rounded-xl bg-rust/10 px-4 py-3 text-sm text-rust">{error}</div>}

      {relationships.length === 0 ? (
        <p className="text-sm text-inkSoft">No relationships recorded yet.</p>
      ) : (
        <ul className="card divide-y divide-line/40">
          {relationships.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex min-w-0 items-center gap-2 text-sm">
                <Icon name="link" className="h-4 w-4 shrink-0 text-goldDeep" />
                <span className="truncate text-ink">{describe(r)}</span>
                {r.status === 'ENDED' && <span className="badge-neutral">ended</span>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {r.personId === memberId || r.relatedPersonId === memberId ? (
                  <Link
                    href={`/family/${r.personId === memberId ? r.relatedPersonId : r.personId}`}
                    className="text-xs font-semibold text-goldDeep hover:text-gold"
                  >
                    View
                  </Link>
                ) : null}
                <button onClick={() => remove(r.id)} className="rounded-lg p-1.5 text-inkSoft transition hover:bg-rust/10 hover:text-rust" title="Remove">
                  <Icon name="trash" className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}