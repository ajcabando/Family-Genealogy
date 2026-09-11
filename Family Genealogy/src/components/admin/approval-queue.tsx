'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Icon } from '../icons';
import { cn, formatRelative, photoUrl } from '@/lib/utils';
import { normalizeProfileUpdate } from '@/lib/change-request-fields';
import type { GalleryPhoto } from '@/lib/photo-shared';

type Member = { id: string; firstName: string; lastName: string };

type RequestItem = {
  id: string;
  requestType: string;
  targetType: string;
  targetId?: string | null;
  oldData?: unknown;
  proposedData: unknown;
  reason?: string | null;
  createdAt: string;
  submittedBy: { email?: string | null; familyMember?: { firstName: string; lastName: string } | null };
  targetMember?: { id: string; firstName: string; lastName: string } | null;
};

type PhotoItem = GalleryPhoto;

type Notes = { id: string; open: boolean; value: string; action: 'approve' | 'reject' | 'needs_info' };

export function ApprovalQueue({ requests, photos, members, initialTab = 'requests' }: { requests: RequestItem[]; photos: PhotoItem[]; members: Member[]; initialTab?: 'requests' | 'photos' }) {
  const [reqItems, setReqItems] = useState(requests);
  const [photoItems, setPhotoItems] = useState(photos);
  const [tab, setTab] = useState<'requests' | 'photos'>(initialTab);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Notes | null>(null);
  const [error, setError] = useState('');

  const nameOf = (id: string) => members.find((m) => m.id === id);
  const fmtName = (id?: string) => {
    if (!id) return '';
    const m = nameOf(id);
    return m ? `${m.firstName} ${m.lastName}` : 'Unknown';
  };

  async function act(kind: 'request' | 'photo', id: string, action: string, note?: string) {
    setBusy(id);
    setError('');
    const url = kind === 'request' ? `/api/change-requests/${id}` : `/api/photos/${id}/review`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, notes: note }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || 'Action failed');
      setBusy(null);
      return;
    }
    if (kind === 'request') setReqItems((prev) => prev.filter((r) => r.id !== id));
    else setPhotoItems((prev) => prev.filter((p) => p.id !== id));
    setNotes(null);
    setBusy(null);
  }

  async function approveAllPhotos() {
    if (photoItems.length === 0) return;
    setBusy('approve-all');
    setError('');
    let ok = 0;
    let failed = 0;
    for (const photo of photoItems) {
      const res = await fetch(`/api/photos/${photo.id}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });
      if (res.ok) ok++;
      else failed++;
    }
    if (failed === 0) {
      setPhotoItems([]);
    } else {
      setError(`${ok} approved, ${failed} failed`);
      setPhotoItems((prev) => prev.slice(ok));
    }
    setBusy(null);
  }

  const requestBody = (r: RequestItem) => {
    const p = (r.proposedData || {}) as Record<string, unknown>;
    const o = (r.oldData || {}) as Record<string, unknown>;
    if (r.requestType === 'PROFILE_UPDATE') {
      const { field: rawField, value } = normalizeProfileUpdate(p);
      const field = rawField.replace(/([A-Z])/g, ' $1').toLowerCase();
      return (
        <div className="rounded-xl bg-cream p-3 text-sm">
          <p className="font-semibold text-ink">Update {field} {r.targetMember ? `for ${r.targetMember.firstName} ${r.targetMember.lastName}` : ''}</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-line/60 bg-white p-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-inkSoft/70">Current</p>
              <p className="mt-0.5 break-words text-inkSoft">{o[rawField] ? String(o[rawField]) : <em className="text-inkSoft/60">not set</em>}</p>
            </div>
            <div className="rounded-lg border border-gold/40 bg-white p-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-goldDeep">Proposed</p>
              <p className="mt-0.5 break-words font-semibold text-ink">{String(value ?? '')}</p>
            </div>
          </div>
        </div>
      );
    }
    if (r.requestType === 'RELATIONSHIP') {
      const type = String(p.type || '');
      const label = type.replace(/_/g, ' ').toLowerCase();
      return (
        <div className="rounded-xl bg-cream p-3 text-sm">
          <p className="font-semibold text-ink">New relationship: {label}</p>
          <p className="mt-2 text-inkSoft">
            <span className="font-semibold text-ink">{fmtName(p.personAId as string)}</span> {label} <span className="font-semibold text-ink">{fmtName(p.personBId as string)}</span>
          </p>
        </div>
      );
    }
    if (r.requestType === 'NEW_MEMBER') {
      return (
        <div className="rounded-xl bg-cream p-3 text-sm">
          <p className="font-semibold text-ink">
            Add {String(p.firstName || '')} {String(p.middleName || '')} {String(p.lastName || '')}
          </p>
          <p className="mt-1 text-inkSoft">
            {p.gender && p.gender !== 'UNKNOWN' ? `${String(p.gender).toLowerCase()} · ` : ''}
            {p.birthDate ? `born ${formatDateOnly(String(p.birthDate))}` : 'birth date unknown'}
            {p.branch ? ` · ${String(p.branch)}` : ''}
          </p>
        </div>
      );
    }
    return <pre className="rounded-xl bg-cream p-3 text-xs">{JSON.stringify(p, null, 2)}</pre>;
  };

  return (
    <div>
      {error && <div className="mb-4 rounded-xl bg-rust/10 px-4 py-3 text-sm text-rust">{error}</div>}

      <div className="mb-5 flex gap-1 rounded-xl bg-parchment/60 p-1">
        {(['requests', 'photos'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn('flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition', tab === t ? 'bg-white text-goldDeep shadow-card' : 'text-inkSoft hover:text-goldDeep')}
          >
            Change requests ({reqItems.length})
            {t === 'photos' && ` · Photos (${photoItems.length})`}
          </button>
        ))}
      </div>

      {tab === 'requests' && (
        <div className="space-y-4">
          {reqItems.length === 0 ? (
            <div className="card flex flex-col items-center gap-2 p-10 text-center">
              <Icon name="check" className="h-8 w-8 text-sage" />
              <p className="text-sm text-inkSoft">No pending change requests. The family tree is up to date.</p>
            </div>
          ) : (
            reqItems.map((r) => (
              <div key={r.id} className="card p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="badge-gold">{r.requestType.replace(/_/g, ' ').toLowerCase()}</span>
                    {r.targetMember && (
                      <Link href={`/family/${r.targetMember.id}`} className="text-sm font-semibold text-goldDeep hover:text-gold">
                        {r.targetMember.firstName} {r.targetMember.lastName}
                      </Link>
                    )}
                  </div>
                  <span className="text-xs text-inkSoft">{formatRelative(r.createdAt)}</span>
                </div>
                <div className="mt-3">{requestBody(r)}</div>
                <p className="mt-3 text-sm text-inkSoft">
                  Submitted by{' '}
                  <span className="font-semibold text-ink">
                    {r.submittedBy.familyMember ? `${r.submittedBy.familyMember.firstName} ${r.submittedBy.familyMember.lastName}` : r.submittedBy.email}
                  </span>
                </p>
                {r.reason && (
                  <p className="mt-1.5 rounded-lg bg-parchment/60 px-3 py-2 text-sm italic text-inkSoft/90">“{r.reason}”</p>
                )}

                {notes?.id === r.id ? (
                  <div className="mt-4 space-y-2">
                    <textarea
                      className="input"
                      rows={2}
                      placeholder={notes.action === 'needs_info' ? 'What clarification is needed?' : 'Review note (optional)'}
                      value={notes.value}
                      onChange={(e) => setNotes({ ...notes, value: e.target.value })}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        disabled={busy === r.id}
                        onClick={() => act('request', r.id, notes.action, notes.value)}
                        className={notes.action === 'reject' ? 'btn-danger' : notes.action === 'needs_info' ? 'btn-ghost' : 'btn-primary'}
                      >
                        {notes.action === 'reject' ? 'Reject' : notes.action === 'needs_info' ? 'Request clarification' : 'Approve'}
                      </button>
                      <button onClick={() => setNotes(null)} className="btn-ghost">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex gap-2">
                    <button disabled={busy === r.id} onClick={() => setNotes({ id: r.id, open: true, value: '', action: 'approve' })} className="btn-primary text-xs">
                      {busy === r.id ? 'Working…' : 'Approve'}
                    </button>
                    <button disabled={busy === r.id} onClick={() => setNotes({ id: r.id, open: true, value: '', action: 'reject' })} className="btn-danger text-xs">
                      Reject
                    </button>
                    <button disabled={busy === r.id} onClick={() => setNotes({ id: r.id, open: true, value: '', action: 'needs_info' })} className="btn-ghost text-xs">
                      Request info
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'photos' && (
        <div>
          {photoItems.length > 0 && (
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-inkSoft">{photoItems.length} photo{photoItems.length === 1 ? '' : 's'} pending</p>
              <button
                disabled={busy === 'approve-all'}
                onClick={approveAllPhotos}
                className="btn-primary"
              >
                {busy === 'approve-all' ? 'Approving…' : `Approve All (${photoItems.length})`}
              </button>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {photoItems.length === 0 ? (
            <div className="card col-span-full flex flex-col items-center gap-2 p-10 text-center">
              <Icon name="check" className="h-8 w-8 text-sage" />
              <p className="text-sm text-inkSoft">No photos pending review.</p>
            </div>
          ) : (
            photoItems.map((p) => (
              <div key={p.id} className="card overflow-hidden">
                <div className="relative aspect-[4/3] bg-parchment">
                  <img src={photoUrl(p, 'full')} alt={p.caption || 'Photo'} className="h-full w-full object-cover" />
                </div>
                <div className="p-4">
                  <p className="text-sm font-bold text-ink">{p.caption || 'Untitled photo'}</p>
                  <p className="mt-0.5 text-xs text-inkSoft">
                    {p.photoDate && formatDateOnly(p.photoDate)}{p.photoDate && p.location ? ' · ' : ''}{p.location}
                  </p>
                  <p className="mt-1 text-xs text-inkSoft">
                    Uploaded by <span className="font-semibold">{p.uploaderName || 'Unknown'}</span> · {formatRelative(p.createdAt)}
                  </p>
                  {p.tags.length > 0 && (
                    <p className="mt-1 text-xs text-inkSoft">Tagged: {p.tags.map((t) => t.name).join(', ')}</p>
                  )}
                  <div className="mt-3 flex gap-2">
                    <button disabled={busy === p.id} onClick={() => act('photo', p.id, 'approve')} className="btn-primary flex-1 text-xs">
                      {busy === p.id ? 'Working…' : 'Approve'}
                    </button>
                    <button disabled={busy === p.id} onClick={() => act('photo', p.id, 'reject')} className="btn-danger flex-1 text-xs">
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        </div>
      )}
    </div>
  );
}

function formatDateOnly(d: string): string {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}