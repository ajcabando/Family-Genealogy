'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from './icons';
import type { MemberOption } from '@/lib/members';

const PROFILE_FIELDS = [
  { key: 'nickname', label: 'Nickname' },
  { key: 'firstName', label: 'First name' },
  { key: 'middleName', label: 'Middle name' },
  { key: 'lastName', label: 'Last name' },
  { key: 'maidenName', label: 'Maiden name' },
  { key: 'birthDate', label: 'Birth date' },
  { key: 'birthPlace', label: 'Birth place' },
  { key: 'deathDate', label: 'Death date' },
  { key: 'deathPlace', label: 'Death place' },
  { key: 'biography', label: 'Biography' },
  { key: 'occupation', label: 'Occupation' },
  { key: 'location', label: 'Location' },
  { key: 'branch', label: 'Family branch' },
];

const REL_TYPES = [
  { key: 'PARENT', label: 'Parent of', note: 'Person A is the parent of Person B' },
  { key: 'CHILD', label: 'Child of', note: 'Person A is the child of Person B' },
  { key: 'SPOUSE', label: 'Spouse of', note: 'Person A and Person B are married' },
  { key: 'SIBLING', label: 'Sibling of', note: 'Person A and Person B are siblings' },
  { key: 'ADOPTED_PARENT', label: 'Adopted parent of', note: 'Person A adopted Person B' },
  { key: 'STEP_PARENT', label: 'Step parent of', note: 'Person A is the step parent of Person B' },
];

export function SuggestModal({
  members,
  defaultMemberId,
  open: initiallyOpen = false,
}: {
  members: MemberOption[];
  defaultMemberId?: string;
  open?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(initiallyOpen);
  const [type, setType] = useState('PROFILE_UPDATE');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [sending, setSending] = useState(false);

  // new member
  const [nm, setNm] = useState({ firstName: '', middleName: '', lastName: '', gender: 'UNKNOWN', birthDate: '', deathDate: '', branch: '' });
  // relationship
  const [relA, setRelA] = useState(defaultMemberId || members[0]?.id || '');
  const [relB, setRelB] = useState('');
  const [relType, setRelType] = useState('PARENT');
  // profile update
  const [target, setTarget] = useState(defaultMemberId || '');
  const [field, setField] = useState('nickname');
  const [value, setValue] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSending(true);
    try {
      let body: Record<string, unknown> = { requestType: type, reason };
      if (type === 'NEW_MEMBER') {
        body = { ...body, proposedData: nm, targetType: 'new_member' };
      } else if (type === 'RELATIONSHIP') {
        body = {
          ...body,
          targetType: 'relationship',
          proposedData: { personAId: relA, personBId: relB, type: relType },
        };
      } else {
        body = {
          ...body,
          targetType: 'family_member',
          targetId: target,
          proposedData: { field, value },
        };
      }
      const res = await fetch('/api/change-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not submit');
      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        router.refresh();
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit');
    } finally {
      setSending(false);
    }
  }

  const input = 'input';
  const label = 'label';

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-ghost">
        <Icon name="edit" className="h-4 w-4" /> Suggest a correction
      </button>
      {open && (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/40 p-4 animate-fade-in" onClick={() => setOpen(false)}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-lift animate-fade-up" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-ink">Suggest a change</h2>
          <button onClick={() => setOpen(false)} className="rounded-lg p-2 text-inkSoft hover:bg-parchment"><Icon name="x" /></button>
        </div>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sage/15 text-sage"><Icon name="check" className="h-6 w-6" /></div>
            <p className="text-sm text-inkSoft">Your suggestion was submitted and is now pending administrator approval.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {error && <div className="rounded-xl bg-rust/10 px-4 py-3 text-sm text-rust">{error}</div>}

            <div>
              <label className={label}>What would you like to suggest?</label>
              <select className={input} value={type} onChange={(e) => setType(e.target.value)}>
                <option value="PROFILE_UPDATE">Update profile information</option>
                <option value="RELATIONSHIP">Add or correct a family relationship</option>
                <option value="NEW_MEMBER">Add a missing family member</option>
              </select>
            </div>

            {type === 'NEW_MEMBER' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={label}>First name</label><input className={input} value={nm.firstName} onChange={(e) => setNm({ ...nm, firstName: e.target.value })} required /></div>
                  <div><label className={label}>Last name</label><input className={input} value={nm.lastName} onChange={(e) => setNm({ ...nm, lastName: e.target.value })} required /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={label}>Middle name</label><input className={input} value={nm.middleName} onChange={(e) => setNm({ ...nm, middleName: e.target.value })} /></div>
                  <div>
                    <label className={label}>Gender</label>
                    <select className={input} value={nm.gender} onChange={(e) => setNm({ ...nm, gender: e.target.value })}>
                      <option value="UNKNOWN">Unknown</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={label}>Birth date</label><input type="date" className={input} value={nm.birthDate} onChange={(e) => setNm({ ...nm, birthDate: e.target.value })} /></div>
                  <div><label className={label}>Death date</label><input type="date" className={input} value={nm.deathDate} onChange={(e) => setNm({ ...nm, deathDate: e.target.value })} /></div>
                </div>
                <div><label className={label}>Family branch</label><input className={input} value={nm.branch} onChange={(e) => setNm({ ...nm, branch: e.target.value })} placeholder="e.g. Cruz – Cebu" /></div>
              </>
            )}

            {type === 'RELATIONSHIP' && (
              <>
                <div>
                  <label className={label}>Relationship</label>
                  <select className={input} value={relType} onChange={(e) => setRelType(e.target.value)}>
                    {REL_TYPES.map((r) => (
                      <option key={r.key} value={r.key}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={label}>Person A</label>
                  <select className={input} value={relA} onChange={(e) => setRelA(e.target.value)}>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-inkSoft">{REL_TYPES.find((r) => r.key === relType)?.note}</p>
                </div>
                <div>
                  <label className={label}>Person B</label>
                  <select className={input} value={relB} onChange={(e) => setRelB(e.target.value)} required>
                    <option value="">Select a family member…</option>
                    {members.filter((m) => m.id !== relA).map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {type === 'PROFILE_UPDATE' && (
              <>
                <div>
                  <label className={label}>Family member</label>
                  <select className={input} value={target} onChange={(e) => setTarget(e.target.value)} required>
                    <option value="">Select…</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={label}>Field</label>
                    <select className={input} value={field} onChange={(e) => setField(e.target.value)}>
                      {PROFILE_FIELDS.map((f) => (
                        <option key={f.key} value={f.key}>{f.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={label}>New value</label>
                    <input className={input} value={value} onChange={(e) => setValue(e.target.value)} required placeholder={field === 'birthDate' || field === 'deathDate' ? 'YYYY-MM-DD' : 'New value'} />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className={label}>Reason / comment</label>
              <textarea className={input} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} required placeholder="Why are you suggesting this? (e.g. based on family records, Aunt Maria told us…)" />
            </div>

            <button type="submit" disabled={sending} className="btn-primary w-full">
              {sending ? 'Submitting…' : 'Submit for approval'}
            </button>
            <p className="text-center text-xs text-inkSoft">All genealogy changes require administrator approval.</p>
          </form>
        )}
      </div>
      </div>
      )}
    </>
  );
}
