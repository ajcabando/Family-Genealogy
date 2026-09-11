'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Icon } from './icons';
import { cn, formatDate, formatRelative, plural } from '@/lib/utils';
import type { GalleryPhoto } from '@/lib/photo-shared';

type MemberOption = { id: string; name: string };

type Comment = {
  id: string;
  body: string;
  authorId: string;
  authorName: string;
  createdAt: string;
};

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
  /** The currently logged-in user's family member ID (for showing delete controls). */
  currentMemberId?: string | null;
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
  // Touch navigation + zoom state for the lightbox
  const [zoom, setZoom] = useState(1);
  const [zoomPan, setZoomPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchStart = useRef<{ x: number; y: number; t: number; dist: number } | null>(null);
  const pinchRef = useRef<{ dist: number; zoom: number } | null>(null);
  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentBusy, setCommentBusy] = useState(false);
  const [commentError, setCommentError] = useState('');
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  const resetZoom = () => {
    setZoom(1);
    setZoomPan({ x: 0, y: 0 });
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      pinchRef.current = { dist: d, zoom };
      return;
    }
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY, t: Date.now(), dist: 0 };
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      const next = Math.min(4, Math.max(1, pinchRef.current.zoom * (d / pinchRef.current.dist)));
      setZoom(next);
      if (next === 1) setZoomPan({ x: 0, y: 0 });
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (e.changedTouches.length === 2 || pinchRef.current) {
      pinchRef.current = null;
      touchStart.current = null;
      return;
    }
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    const dt = Date.now() - start.t;
    // Double-tap toggles zoom when the image is not being pinched.
    if (Math.hypot(dx, dy) < 12 && dt < 300) {
      setZoom((z) => {
        if (z > 1) {
          setZoomPan({ x: 0, y: 0 });
          return 1;
        }
        return 2.5;
      });
      return;
    }
    // Swipe left/right navigates only when zoomed out.
    if (zoom === 1 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && dt < 600) {
      step(dx < 0 ? 1 : -1);
    }
  };

  const onImageDoubleClick = () => {
    setZoom((z) => {
      if (z > 1) {
        setZoomPan({ x: 0, y: 0 });
        return 1;
      }
      return 2.5;
    });
  };

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

  // Reset zoom and load comments whenever the open photo changes.
  useEffect(() => {
    resetZoom();
    setTagOpen(false);
    setCommentText('');
    setCommentError('');
    setCommentsLoaded(false);
    setComments([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openIndex]);

  // Load comments when a photo is opened
  useEffect(() => {
    if (openIndex === null || commentsLoaded) return;
    const photo = photos[openIndex];
    if (!photo) return;

    fetch(`/api/photos/${photo.id}/comments`)
      .then((r) => r.json())
      .then((data) => {
        if (data.comments) setComments(data.comments);
        setCommentsLoaded(true);
      })
      .catch(() => setCommentsLoaded(true));
  }, [openIndex, commentsLoaded, photos]);

  async function toggleFavorite(photoId: string) {
    if (busy) return;
    setBusy(true);
    const res = await fetch(`/api/photos/${photoId}/favorite`, { method: 'POST' });
    if (res.ok) {
      setPhotos((prev) => prev.map((p) => (p.id === photoId ? { ...p, favorite: !p.favorite } : p)));
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

  async function removeTag(memberId: string) {
    if (!openPhoto || busy) return;
    setBusy(true);
    const res = await fetch(`/api/photos/${openPhoto.id}/tags`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId }),
    });
    if (res.ok) {
      const data = await res.json();
      setPhotos((prev) => prev.map((p) => (p.id === openPhoto.id ? { ...p, tags: data.tags } : p)));
    }
    setBusy(false);
  }

  async function postComment() {
    if (!openPhoto || !commentText.trim() || commentBusy) return;
    setCommentBusy(true);
    setCommentError('');
    try {
      const res = await fetch(`/api/photos/${openPhoto.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: commentText.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setComments((prev) => [...prev, data.comment]);
        setCommentText('');
      } else {
        setCommentError(data.error || 'Failed to post comment.');
      }
    } catch {
      setCommentError('Network error — please try again.');
    }
    setCommentBusy(false);
  }

  async function deleteComment(commentId: string) {
    if (!openPhoto || busy) return;
    setBusy(true);
    const res = await fetch(`/api/photos/${openPhoto.id}/comments/${commentId}`, { method: 'DELETE' });
    if (res.ok) {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
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
                  {p.tags.length > 0 && <span className="flex items-center gap-1"><Icon name="user" className="h-3 w-3" />{plural(p.tags.length, 'person')}</span>}
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
              {canEdit && (
                <>
                  <button onClick={() => toggleFavorite(openPhoto.id)} className="rounded-lg p-2.5 transition hover:bg-white/10" title="Favorite">
                    <Icon name="heart" className={cn('h-5 w-5', openPhoto.favorite && 'fill-gold text-gold')} />
                  </button>
                  <button onClick={() => setTagOpen((o) => !o)} className="rounded-lg p-2.5 text-white/80 transition hover:bg-white/10" title="Tag people">
                    <Icon name="userPlus" />
                  </button>
                </>
              )}
              <button onClick={() => setOpenIndex(null)} className="rounded-lg p-2.5 text-white/80 transition hover:bg-white/10" title="Close">
                <Icon name="x" />
              </button>
            </div>
          </div>

          {/* image + side info */}
          <div className="flex min-h-0 flex-1 flex-col lg:flex-row" onClick={(e) => e.stopPropagation()}>
            <div
              className="relative flex min-h-0 touch-pan-y flex-1 items-center justify-center overflow-hidden px-4 sm:px-16"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              {openIndex !== null && openIndex > 0 && zoom === 1 && (
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
                onClick={onImageDoubleClick}
                onDoubleClick={onImageDoubleClick}
                style={{
                  transform: zoom > 1 ? `scale(${zoom}) translate(${zoomPan.x}px, ${zoomPan.y}px)` : undefined,
                  transition: 'transform 150ms ease-out',
                  cursor: zoom > 1 ? 'zoom-out' : 'zoom-in',
                }}
                className="max-h-full max-w-full select-none rounded-xl object-contain shadow-lift"
              />
              {openIndex !== null && openIndex < photos.length - 1 && zoom === 1 && (
                <button
                  onClick={() => step(1)}
                  className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white transition hover:bg-white/25 sm:right-4"
                  title="Next"
                >
                  <Icon name="chevronRight" />
                </button>
              )}
              {zoom > 1 && (
                <button
                  onClick={() => {
                    setZoom(1);
                    setZoomPan({ x: 0, y: 0 });
                  }}
                  className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-white/15 px-4 py-2 text-xs font-bold text-white backdrop-blur transition hover:bg-white/30"
                >
                  Reset zoom
                </button>
              )}
            </div>

            <aside onClick={(e) => e.stopPropagation()} className="w-full shrink-0 border-t border-white/10 bg-ink/40 p-5 text-white lg:w-96 lg:border-l lg:border-t-0 lg:overflow-y-auto">
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

              {/* ---- Tags ---- */}
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">Tagged</p>
                {openPhoto.tags.length === 0 ? (
                  <p className="text-sm text-white/50">No one tagged yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {openPhoto.tags.map((t) => (
                      <span key={t.id} className="group/tag inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-gold hover:text-ink">
                        <Link
                          href={`/family/${t.memberId}`}
                          onClick={() => setOpenIndex(null)}
                          className="hover:underline"
                        >
                          {t.name}
                        </Link>
                        {canEdit && (
                          <button
                            onClick={() => removeTag(t.memberId)}
                            className="ml-0.5 hidden h-3.5 w-3.5 items-center justify-center rounded-full transition hover:bg-white/20 group-hover/tag:inline-flex"
                            title={`Remove ${t.name}`}
                          >
                            <Icon name="x" className="h-2.5 w-2.5" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* ---- Tag picker ---- */}
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

              {/* ---- Comments ---- */}
              <div className="mt-5 border-t border-white/10 pt-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/50">
                  Comments {comments.length > 0 && <span className="text-white/40">({comments.length})</span>}
                </p>

                {comments.length === 0 ? (
                  <p className="text-sm text-white/40">No comments yet.</p>
                ) : (
                  <div className="space-y-3">
                    {comments.map((c) => (
                      <div key={c.id} className="group/comment rounded-lg bg-white/5 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-white">{c.authorName}</p>
                            <p className="mt-1 text-sm text-white/70 whitespace-pre-wrap break-words">{c.body}</p>
                          </div>
                          {canEdit && (c.authorId === currentMemberId) && (
                            <button
                              onClick={() => deleteComment(c.id)}
                              className="hidden shrink-0 rounded p-1 text-white/30 transition hover:bg-white/10 hover:text-white/70 group-hover/comment:inline-flex"
                              title="Delete comment"
                            >
                              <Icon name="trash" className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                        <p className="mt-1.5 text-[11px] text-white/30">{formatRelative(c.createdAt)}</p>
                      </div>
                    ))}
                  </div>
                )}

                {canEdit ? (
                  <div className="mt-3">
                    <textarea
                      ref={commentInputRef}
                      value={commentText}
                      onChange={(e) => { setCommentText(e.target.value); setCommentError(''); }}
                      placeholder="Add a comment…"
                      rows={2}
                      className="w-full resize-none rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-gold/50 focus:ring-1 focus:ring-gold/30"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault();
                          postComment();
                        }
                      }}
                    />
                    <div className="mt-2 flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        {commentError && <p className="text-[11px] text-rust">{commentError}</p>}
                        {!commentError && <p className="text-[11px] text-white/30">{commentText.length}/2000</p>}
                      </div>
                      <button
                        onClick={postComment}
                        disabled={!commentText.trim() || commentBusy || commentText.length > 2000}
                        className="btn-gold px-3 py-1.5 text-xs"
                      >
                        {commentBusy ? 'Posting…' : 'Post'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-white/40">
                    <Link href="/login" className="underline transition hover:text-gold">Sign in</Link> to add a comment.
                  </p>
                )}
              </div>
            </aside>
          </div>
        </div>
      )}
    </>
  );
}
