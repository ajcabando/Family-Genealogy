'use client';

import { useState } from 'react';
import { Icon } from './icons';
import { cn, formatDate, plural } from '@/lib/utils';
import { PhotoLightbox, type LightboxAlbumContext } from './photos/photo-lightbox';
import type { GalleryPhoto } from '@/lib/photo-shared';

type MemberOption = { id: string; name: string };

export function PhotoGallery({
  initialPhotos,
  total,
  albumId,
  personId,
  favoritesOnly = false,
  locationFilter,
  sort = 'newest',
  query,
  viewMode = 'grid',
  canDownload,
  canEdit = true,
  members,
  initialPhotoId,
  currentMemberId,
  isAdmin = false,
  albumContext = null,
}: {
  initialPhotos: GalleryPhoto[];
  total: number;
  albumId?: string;
  personId?: string;
  favoritesOnly?: boolean;
  locationFilter?: string;
  sort?: 'newest' | 'oldest';
  query?: string;
  viewMode?: 'grid' | 'list';
  canDownload: boolean;
  /** Whether the viewer is signed in (enables favorites + tagging). */
  canEdit?: boolean;
  members: MemberOption[];
  initialPhotoId?: string;
  /** The currently logged-in user's family member ID (for show/hide manage controls). */
  currentMemberId?: string | null;
  /** Admins get review + moderation actions in the viewer's ⋮ menu. */
  isAdmin?: boolean;
  /** Album being browsed, shown in the viewer's context chip + "View album". */
  albumContext?: LightboxAlbumContext | null;
}) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialPhotos.length < total);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(
    initialPhotoId ? Math.max(0, initialPhotos.findIndex((p) => p.id === initialPhotoId)) : null,
  );

  const openPhoto = openIndex !== null ? photos[openIndex] : null;

  async function loadMore() {
    setLoadingMore(true);
    const params = new URLSearchParams({ page: String(page + 1), limit: '24', sort });
    if (albumId) params.set('albumId', albumId);
    if (personId) params.set('personId', personId);
    if (favoritesOnly) params.set('favorite', '1');
    if (locationFilter) params.set('location', locationFilter);
    if (query) params.set('q', query);
    const res = await fetch(`/api/photos?${params}`);
    if (res.ok) {
      const data = await res.json();
      setPhotos((prev) => [...prev, ...data.photos]);
      setHasMore(data.hasMore);
      setPage((p) => p + 1);
    }
    setLoadingMore(false);
  }

  function updatePhoto(id: string, patch: Partial<GalleryPhoto>) {
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function removePhoto(id: string) {
    const idx = photos.findIndex((p) => p.id === id);
    const next = photos.filter((p) => p.id !== id);
    setPhotos(next);
    if (next.length === 0) {
      setOpenIndex(null);
      return;
    }
    if (idx >= 0) setOpenIndex(Math.min(idx, next.length - 1));
  }

  async function toggleFavorite(photoId: string) {
    if (busy) return;
    setBusy(true);
    const res = await fetch(`/api/photos/${photoId}/favorite`, { method: 'POST' });
    if (res.ok) {
      setPhotos((prev) => prev.map((p) => (p.id === photoId ? { ...p, favorite: !p.favorite } : p)));
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
      ) : viewMode === 'list' ? (
        <div className="space-y-3">
          {photos.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setOpenIndex(i)}
              className="group flex w-full items-center gap-4 rounded-2xl border border-line/60 bg-white p-3 text-left shadow-card transition hover:shadow-lift"
            >
              <div className="h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-parchment">
                <img
                  src={`/api/files/${p.optimizedPath}`}
                  alt={p.caption || 'Family photo'}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-sm font-bold text-ink">{p.caption || 'Family photo'}</p>
                <p className="mt-1 text-xs text-inkSoft">
                  {p.photoDate && <span>{formatDate(p.photoDate)}</span>}
                  {p.photoDate && p.location && <span> • </span>}
                  {p.location && <span>{p.location}</span>}
                </p>
                <p className="mt-1 flex items-center gap-3 text-[11px] text-inkSoft/80">
                  {p.tags.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Icon name="user" className="h-3 w-3" />
                      {plural(p.tags.length, 'person')}
                    </span>
                  )}
                  {p.comments.length > 0 && <span>{plural(p.comments.length, 'comment')}</span>}
                </p>
              </div>
              {canEdit && (
                <span
                  role="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(p.id);
                  }}
                  className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-inkSoft transition hover:bg-parchment"
                  title={p.favorite ? 'Remove favorite' : 'Add favorite'}
                >
                  <Icon name="heart" className={cn('h-4 w-4', p.favorite && 'fill-gold text-gold')} />
                </span>
              )}
              <Icon name="chevronRight" className="h-4 w-4 shrink-0 text-inkSoft/40" />
            </button>
          ))}
        </div>
      ) : (
        <div className="masonry">
          {photos.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setOpenIndex(i)}
              className="masonry-item group relative block w-full overflow-hidden rounded-2xl border border-line/60 bg-white text-left shadow-card transition hover:shadow-lift"
            >
              <img
                src={`/api/files/${p.optimizedPath}`}
                alt={p.caption || 'Family photo'}
                loading="lazy"
                className="w-full object-cover transition duration-300 group-hover:scale-[1.02]"
              />
              {/* favorite heart — top left */}
              {canEdit ? (
                <span
                  role="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(p.id);
                  }}
                  className="absolute left-2.5 top-2.5 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-white/85 text-inkSoft shadow-card backdrop-blur transition hover:bg-white"
                  title={p.favorite ? 'Remove favorite' : 'Add favorite'}
                >
                  <Icon name="heart" className={cn('h-3.5 w-3.5', p.favorite && 'fill-gold text-gold')} />
                </span>
              ) : p.favorite ? (
                <span className="absolute left-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/85 shadow-card">
                  <Icon name="heart" className="h-3.5 w-3.5 fill-gold text-gold" />
                </span>
              ) : null}
              {/* three-dot menu — top right */}
              <span className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/85 text-inkSoft shadow-card backdrop-blur">
                <Icon name="dots" className="h-4 w-4" />
              </span>
              {/* bottom overlay: caption + date • location */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/85 via-ink/45 to-transparent p-3 pt-10">
                {p.caption && <p className="line-clamp-1 text-sm font-bold text-white">{p.caption}</p>}
                <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-white/80">
                  <Icon name="photo" className="h-3 w-3" />
                  {p.photoDate ? formatDate(p.photoDate) : 'Date unknown'}
                  {p.photoDate && p.location && <span>•</span>}
                  {p.location && <span>{p.location}</span>}
                </p>
              </div>
              {/* person count — bottom right */}
              {p.tags.length > 0 && (
                <span className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1 text-[11px] font-bold text-white drop-shadow">
                  <Icon name="user" className="h-3.5 w-3.5" />
                  {p.tags.length}
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

      {openPhoto && openIndex !== null && (
        <PhotoLightbox
          photos={photos}
          index={openIndex}
          onIndexChange={setOpenIndex}
          onClose={() => setOpenIndex(null)}
          onUpdatePhoto={updatePhoto}
          onRemovePhoto={removePhoto}
          canDownload={canDownload}
          canEdit={canEdit}
          isAdmin={isAdmin}
          members={members}
          currentMemberId={currentMemberId}
          albumContext={albumContext}
        />
      )}
    </>
  );
}
