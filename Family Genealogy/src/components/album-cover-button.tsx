'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from './icons';

type PickerPhoto = { id: string; thumbPath: string; caption: string | null };

/**
 * Admin control to pin a specific album cover photo (or unpin to resume the
 * random rotation). Shown on album cards in the reunion overview.
 */
export function AlbumCoverButton({ albumId, coverPhotoId }: { albumId: string; coverPhotoId?: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [photos, setPhotos] = useState<PickerPhoto[] | null>(null);
  const [pinned, setPinned] = useState<string | null>(coverPhotoId || null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || photos) return;
    fetch(`/api/reunions/albums/${albumId}`)
      .then((r) => r.json())
      .then((d) => setPhotos(d.photos || []))
      .catch(() => setPhotos([]));
  }, [open, photos, albumId]);

  async function setCover(photoId: string | null) {
    setBusy(true);
    setError('');
    const res = await fetch(`/api/reunions/albums/${albumId}/cover`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoId }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || 'Could not update cover');
      return;
    }
    setPinned(photoId);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className="rounded-lg bg-white/85 p-1.5 text-inkSoft shadow-card backdrop-blur transition hover:bg-white hover:text-goldDeep"
        title={pinned ? 'Change pinned cover' : 'Pin a cover photo'}
        aria-label="Album cover settings"
      >
        <Icon name="pin" className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/40 p-4 animate-fade-in" onClick={() => setOpen(false)}>
          <div className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-lift animate-fade-up" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-ink">Album cover</h2>
              <button onClick={() => setOpen(false)} className="rounded-lg p-2 text-inkSoft hover:bg-parchment" aria-label="Close">
                <Icon name="x" />
              </button>
            </div>
            {error && <div className="mb-3 rounded-xl bg-rust/10 px-3 py-2 text-sm text-rust">{error}</div>}
            <p className="mb-3 text-xs text-inkSoft">
              Pin a photo to always use it as the album cover — or unpin to rotate a random photo on every visit.
            </p>

            {!photos ? (
              <p className="py-6 text-center text-sm text-inkSoft">Loading…</p>
            ) : photos.length === 0 ? (
              <p className="py-6 text-center text-sm text-inkSoft">No approved photos in this album yet.</p>
            ) : (
              <>
                <div className="grid grid-cols-4 gap-2">
                  {photos.map((p) => (
                    <button
                      key={p.id}
                      disabled={busy}
                      onClick={() => setCover(p.id)}
                      className={`relative overflow-hidden rounded-xl border-2 transition ${
                        pinned === p.id ? 'border-goldDeep ring-2 ring-gold/40' : 'border-transparent hover:border-line'
                      }`}
                      title={p.caption || 'Photo'}
                    >
                      <img src={`/api/files/${p.thumbPath}`} alt={p.caption || 'Photo'} className="aspect-square w-full object-cover" />
                      {pinned === p.id && (
                        <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-goldDeep text-white">
                          <Icon name="pin" className="h-3 w-3" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                {pinned && (
                  <button onClick={() => setCover(null)} disabled={busy} className="btn-ghost mt-3 w-full text-xs">
                    <Icon name="x" className="h-3.5 w-3.5" /> Unpin — use random cover
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
