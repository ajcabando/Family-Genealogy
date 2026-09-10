'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Icon } from './icons';
import { cn, formatDate, formatRelative, plural } from '@/lib/utils';
import type { GalleryPhoto } from '@/lib/photo-shared';

type MemberOption = { id: string; name: string };

export function PhotoGallery({
  initialPhotos,
  total,
  albumId,
  personId,
  canDownload,
  members,
  initialPhotoId,
}: {
  initialPhotos: GalleryPhoto[];
  total: number;
  albumId?: string;
  personId?: string;
  canDownload: boolean;
  members: MemberOption[];
  initialPhotoId?: string;
}) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialPhotos.length < total);
  const [loadingMore, setLoadingMore] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(
    initialPhotoId ? Math.max(0, initialPhotos.findIndex((p) => p.id === initialPhotoId)) : null,
  );
  const [tagOpen, setTagOpen] = useState(false);
  const [tagSel, setTagSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const openPhoto = openIndex !== null ? photos[openIndex] : null;

  async function loadMore() {
    setLoadingMore(true);
    const params = new URLSearchParams({ page: String(page + 1), limit: '24' });
    if (albumId) params.set('albumId', albumId);
    if (personId) params.set('personId', personId);
    const res = await fetch(`/api/photos?${params}`);
    if (res.ok) {
      const data = await res.json();
      setPhotos((prev) => [...prev, ...data.photos]);
      setHasMore(data.hasMore);
      setPage((p) => p + 1);
    }
    setLoadingMore(false);
  }

  const step = useCallback(
    (dir: number) => {
      if (openIndex === null) return;
      const next = openIndex + dir;
      if (next < 0 || next >= photos.length) return;
      setOpenIndex(next);
      setTagOpen(false);
    },
    [openIndex, photos.length],
  );

  useEffect(() => {
    if (openIndex === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenIndex(null);
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openIndex, step]);

  async function toggleFavorite() {
    if (!openPhoto || busy) return;
    setBusy(true);
    const res = await fetch(`/api/photos/${openPhoto.id}/favorite`, { method: 'POST' });
    if (res.ok) {
      setPhotos((prev) => prev.map((p) => (p.id === openPhoto.id ? { ...p, favorite: !p.favorite } : p)));
    }
    setBusy(false);
  }

  async function addTags() {
    if (!openPhoto || tagSel.size === 0) return;
    setBusy(true);
    const res = await fetch(`/api/photos/${openPhoto.id}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberIds: [...tagSel] }),
    });
    if (res.ok) {
      const data = await res.json();
      setPhotos((prev) => prev.map((p) => (p.id === openPhoto.id ? { ...p, tags: data.tags } : p)));
      setTagSel(new Set());
      setTagOpen(false);
    }
    setBusy(false);
  }

  return (
    <>
      {photos.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 p-10 text-center">
          <Icon name="photo" className="h-8 w-8 text-inkSoft/40" />
          <p className="text-sm text-inkSoft">No photos here yet.</p>
        </div>
      ) : (
        <div className="masonry">
          {photos.map((p) => (
            <button
              key={p.id}
              onClick={() => setOpenIndex(photos.indexOf(p))}
              className="masonry-item group relative block w-full overflow-hidden rounded-2xl border border-line/60 bg-white text-left shadow-card transition hover:shadow-lift"
            >
              <img
                src={`/api/files/${p.optimizedPath}`}
                alt={p.caption || 'Family photo'}
                loading="lazy"
                className="w-full object-cover transition duration-300 group-hover:scale-[1.02]"
              />
              <div className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-ink/70 via-transparent to-transparent p-3 opacity-0 transition group-hover:opacity-100">
                {p.caption && <p className="line-clamp-2 text-sm font-semibold text-white">{p.caption}</p>}
                <p className="mt-1 flex items-center gap-2 text-[11px] text-white/80">
                  {p.photoDate && <span>{formatDate(p.photoDate)}</span>}
                  {p.tags.length > 0 && <span>{plural(p.tags.length, 'person')} tagged</span>}
                </p>
              </div>
              {p.favorite && (
                <span className="absolute right-2.5 top-2.5 text-gold drop-shadow">
                  <Icon name="heart" className="h-4 w-4 fill-gold" />
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {hasMore && (
        <div className="mt-6 text-center">
          <button onClick={loadMore} disabled={loadingMore} className="btn-ghost">
            {loadingMore ? 'Loading…' : 'Load more photos'}
          </button>
        </div>
      )}

      {/* ---------- Lightbox ---------- */}
      {openPhoto && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-ink/95 animate-fade-in" onClick={() => setOpenIndex(null)}>
          {/* top bar */}
          <div className="flex items-center justify-between px-4 py-3 text-white sm:px-6" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm text-white/70">
              {openIndex !== null ? openIndex + 1 : 0} / {photos.length}
            </p>
            <div className="flex items-center gap-1">
              {canDownload && (
                <a
                  href={`/api/files/${openPhoto.optimizedPath}?download=1`}
                  className="rounded-lg p-2.5 text-white/80 transition hover:bg-white/10"
                  title="Download"
                >
                  <Icon name="download" />
                </a>
              )}
              <button onClick={toggleFavorite} className="rounded-lg p-2.5 transition hover:bg-white/10" title="Favorite">
                <Icon name="heart" className={cn('h-5 w-5', openPhoto.favorite && 'fill-gold text-gold')} />
              </button>
              <button onClick={() => setTagOpen((o) => !o)} className="rounded-lg p-2.5 text-white/80 transition hover:bg-white/10" title="Tag people">
                <Icon name="userPlus" />
              </button>
              <button onClick={() => setOpenIndex(null)} className="rounded-lg p-2.5 text-white/80 transition hover:bg-white/10" title="Close">
                <Icon name="x" />
              </button>
            </div>
          </div>

          {/* image + side info */}
          <div className="flex min-h-0 flex-1 flex-col lg:flex-row" onClick={(e) => e.stopPropagation()}>
            <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 sm:px-16">
              {openIndex !== null && openIndex > 0 && (
                <button
                  onClick={() => step(-1)}
                  className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white transition hover:bg-white/25 sm:left-4"
                  title="Previous"
                >
                  <Icon name="chevronLeft" />
                </button>
              )}
              <img
                src={`/api/files/${openPhoto.optimizedPath}`}
                alt={openPhoto.caption || 'Family photo'}
                className="max-h-full max-w-full rounded-xl object-contain shadow-lift"
              />
              {openIndex !== null && openIndex < photos.length - 1 && (
                <button
                  onClick={() => step(1)}
                  className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white transition hover:bg-white/25 sm:right-4"
                  title="Next"
                >
                  <Icon name="chevronRight" />
                </button>
              )}
            </div>

            <aside className="w-full shrink-0 border-t border-white/10 bg-ink/40 p-5 text-white lg:w-96 lg:border-l lg:border-t-0 lg:overflow-y-auto">
              {openPhoto.caption && <h3 className="font-display text-lg font-bold">{openPhoto.caption}</h3>}
              {openPhoto.description && <p className="mt-2 text-sm text-white/70">{openPhoto.description}</p>}
              <dl className="mt-4 space-y-1.5 text-sm text-white/80">
                {openPhoto.photoDate && (
                  <div className="flex gap-2"><dt className="w-24 shrink-0 text-white/50">Date</dt><dd>{formatDate(openPhoto.photoDate)}</dd></div>
                )}
                {openPhoto.location && (
                  <div className="flex gap-2"><dt className="w-24 shrink-0 text-white/50">Location</dt><dd>{openPhoto.location}</dd></div>
                )}
                {openPhoto.photographer && (
                  <div className="flex gap-2"><dt className="w-24 shrink-0 text-white/50">Photographer</dt><dd>{openPhoto.photographer}</dd></div>
                )}
                {openPhoto.uploaderName && (
                  <div className="flex gap-2"><dt className="w-24 shrink-0 text-white/50">Uploaded by</dt><dd>{openPhoto.uploaderName}</dd></div>
                )}
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 text-white/50">Uploaded</dt>
                  <dd>{formatRelative(openPhoto.createdAt)}</dd>
                </div>
              </dl>

              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">Tagged</p>
                {openPhoto.tags.length === 0 ? (
                  <p className="text-sm text-white/50">No one tagged yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {openPhoto.tags.map((t) => (
                      <Link
                        key={t.id}
                        href={`/family/${t.memberId}`}
                        onClick={() => setOpenIndex(null)}
                        className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-gold hover:text-ink"
                      >
                        {t.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {tagOpen && (
                <div className="mt-4 rounded-xl border border-white/15 bg-white/5 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">Tag family members</p>
                  <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
                    {members.map((m) => (
                      <label key={m.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-sm transition hover:bg-white/10">
                        <input
                          type="checkbox"
                          checked={tagSel.has(m.id)}
                          onChange={(e) => {
                            const next = new Set(tagSel);
                            if (e.target.checked) next.add(m.id);
                            else next.delete(m.id);
                            setTagSel(next);
                          }}
                          className="h-4 w-4 rounded accent-gold"
                        />
                        {m.name}
                        {openPhoto.tags.some((t) => t.memberId === m.id) && <span className="text-[10px] text-white/40">(tagged)</span>}
                      </label>
                    ))}
                  </div>
                  <button onClick={addTags} disabled={tagSel.size === 0 || busy} className="btn-gold mt-2 w-full text-xs">
                    Add tags
                  </button>
                </div>
              )}
            </aside>
          </div>
        </div>
      )}
    </>
  );
}