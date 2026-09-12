'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from './icons';
import { cn } from '@/lib/utils';
import type { GalleryPhoto } from '@/lib/photo-shared';

export function ChangeProfilePhotoButton({
  memberId,
  archivePhotos,
}: {
  memberId: string;
  archivePhotos: GalleryPhoto[];
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'archive' | 'upload'>('archive');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function setFromArchive(photoId: string) {
    setBusy(true);
    setError('');
    const res = await fetch(`/api/members/${memberId}/profile-photo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoId }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || 'Could not update photo');
      return;
    }
    finish();
  }

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError('');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('profileFor', memberId);
    fd.append('caption', 'Profile photo');
    const res = await fetch('/api/photos', { method: 'POST', body: fd });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || 'Upload failed');
      return;
    }
    finish();
  }

  function finish() {
    setDone(true);
    setTimeout(() => {
      setOpen(false);
      setDone(false);
      router.refresh();
    }, 1000);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-goldDeep text-white shadow-card transition hover:bg-gold"
        title="Change profile photo"
      >
        <Icon name="camera" className="h-4 w-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/40 p-4 animate-fade-in" onClick={() => setOpen(false)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-lift animate-fade-up" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-ink">Profile photo</h2>
              <button onClick={() => setOpen(false)} className="rounded-lg p-2 text-inkSoft hover:bg-parchment"><Icon name="x" /></button>
            </div>

            {done ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sage/15 text-sage"><Icon name="check" className="h-6 w-6" /></div>
                <p className="text-sm text-inkSoft">Profile photo updated.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {error && <div className="rounded-xl bg-rust/10 px-4 py-3 text-sm text-rust">{error}</div>}

                <div className="flex gap-1 rounded-xl bg-parchment/60 p-1">
                  {(['archive', 'upload'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={cn('flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition', tab === t ? 'bg-white text-goldDeep shadow-card' : 'text-inkSoft hover:text-goldDeep')}
                    >
                      {t === 'archive' ? 'From the archive' : 'Upload new'}
                    </button>
                  ))}
                </div>

                {tab === 'archive' && (
                  <div>
                    <p className="mb-2 text-xs text-inkSoft">Photos featuring you in the archive.</p>
                    {archivePhotos.length === 0 ? (
                      <div className="rounded-xl bg-cream p-6 text-center text-sm text-inkSoft">
                        No archive photos found. Try uploading a new one.
                      </div>
                    ) : (
                      <div className="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
                        {archivePhotos.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => setFromArchive(p.id)}
                            disabled={busy}
                            className="group relative aspect-square overflow-hidden rounded-xl border border-line/60 transition hover:border-gold"
                          >
                            <img src={`/api/files/${p.thumbPath}`} alt={p.caption || 'Photo'} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {tab === 'upload' && (
                  <button
                    onClick={() => fileInput.current?.click()}
                    disabled={busy}
                    className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line bg-cream px-4 py-10 text-center transition hover:border-goldLight"
                  >
                    <Icon name="upload" className="h-7 w-7 text-goldDeep" />
                    <p className="text-sm font-semibold text-ink">{busy ? 'Uploading…' : 'Choose a photo from your device'}</p>
                    <p className="text-xs text-inkSoft">This publishes immediately as your profile photo</p>
                    <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={upload} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}