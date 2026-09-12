'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Icon } from '../icons';
import { cn, formatDate, formatRelative } from '@/lib/utils';
import type { GalleryPhoto } from '@/lib/photo-shared';

export type LightboxMember = { id: string; name: string };
export type LightboxAlbumContext = { name: string; href?: string; total?: number };

type PhotoComment = GalleryPhoto['comments'][number];
type PhotoTag = GalleryPhoto['tags'][number];

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEPS = [1, 1.25, 1.5, 2, 2.5, 3, 4];
const COMMENT_LIMIT = 2000;

const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(z.toFixed(3))));
const clampPct = (n: number) => Math.round(Math.min(100, Math.max(0, n)) * 100) / 100;

/** Small glassy circular toolbar control with an accessible label + tooltip. */
function ToolButton({
  label,
  onClick,
  active,
  disabled,
  className,
  children,
  tooltipSide = 'bottom',
}: {
  label: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
  tooltipSide?: 'bottom' | 'top';
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'group/tip relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.07] text-white/85 backdrop-blur-md transition',
        'hover:border-white/20 hover:bg-white/[0.16] hover:text-white active:scale-95',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-archiveAccent/70',
        'disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-white/[0.07]',
        active && 'border-archiveAccent/50 bg-archiveAccent/25 text-white',
        className,
      )}
    >
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute left-1/2 z-40 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-black/85 px-2 py-1 text-[11px] font-medium text-white/90 backdrop-blur-md group-hover/tip:block',
          tooltipSide === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2',
        )}
      >
        {label}
      </span>
    </button>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="w-[86px] shrink-0 text-[13px] text-archiveMuted">{label}</dt>
      <dd className="min-w-0 flex-1 break-words text-[13px] text-white/90">{children}</dd>
    </div>
  );
}

export function PhotoLightbox({
  photos,
  index,
  onIndexChange,
  onClose,
  onUpdatePhoto,
  onRemovePhoto,
  canDownload,
  canEdit,
  isAdmin,
  members,
  currentMemberId,
  albumContext,
}: {
  photos: GalleryPhoto[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  onUpdatePhoto: (id: string, patch: Partial<GalleryPhoto>) => void;
  onRemovePhoto: (id: string) => void;
  canDownload: boolean;
  canEdit: boolean;
  isAdmin: boolean;
  members: LightboxMember[];
  currentMemberId?: string | null;
  albumContext?: LightboxAlbumContext | null;
}) {
  const photo = photos[index] ?? null;

  // ----- device -----
  // The viewer is opened by interaction (or a ?photo= deep link), so it is rendered after
  // mount only. That keeps the layout below in sync with matchMedia instead of hydrating a
  // desktop toolbar into a phone's DOM.
  const [mounted, setMounted] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window === 'undefined' ? true : window.matchMedia('(min-width: 1024px)').matches,
  );
  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => setIsDesktop(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // ----- view state -----
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [layer, setLayer] = useState({ w: 0, h: 0 });
  const [showThumbs, setShowThumbs] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);

  // ----- interaction state -----
  const [favBusy, setFavBusy] = useState(false);
  const [heartPop, setHeartPop] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(true);

  // ----- tagging -----
  const [tagMode, setTagMode] = useState(false);
  const [tagBusy, setTagBusy] = useState(false);
  const [pending, setPending] = useState<{ x: number; y: number } | null>(null);
  const [pickerQuery, setPickerQuery] = useState('');
  const [dragPos, setDragPos] = useState<{ id: string; x: number; y: number } | null>(null);
  const [activeTagId, setActiveTagId] = useState<string | null>(null);

  // ----- comments -----
  const [comments, setComments] = useState<PhotoComment[]>(photo?.comments ?? []);
  const [commentText, setCommentText] = useState('');
  const [commentBusy, setCommentBusy] = useState(false);
  const [commentError, setCommentError] = useState('');

  // ----- mobile sheet -----
  const [sheetSnap, setSheetSnap] = useState<'closed' | 'half' | 'full'>('closed');
  const [dragY, setDragY] = useState<number | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const dragRef = useRef<{ id: string; memberId: string; moved: boolean } | null>(null);
  const dragPosRef = useRef<{ x: number; y: number } | null>(null);
  const gestureRef = useRef<{ x: number; y: number; at: number; moved: boolean; panX: number; panY: number } | null>(null);
  const pinchRef = useRef<{ dist: number; zoom: number } | null>(null);
  const sheetTouchRef = useRef<{ startY: number; base: number } | null>(null);
  const barSwipeRef = useRef<{ y: number; moved: boolean } | null>(null);
  const lastTapRef = useRef(0);

  const imageUrl = photo ? `/api/files/${photo.optimizedPath}` : '';
  const thumbUrl = photo ? `/api/files/${photo.thumbPath}` : '';
  // Guard against older API payloads where coordinates come back undefined.
  const placedTags = useMemo(
    () =>
      photo
        ? photo.tags.filter(
            (t): t is PhotoTag & { x: number; y: number } => typeof t.x === 'number' && typeof t.y === 'number',
          )
        : [],
    [photo],
  );

  const isOwner = !!photo && !!currentMemberId && photo.uploaderId === currentMemberId;
  const canManagePhoto = !!photo && (isAdmin || (canEdit && isOwner));
  const canComment = canEdit && !!currentMemberId;

  // ----- helpers -----
  const flash = useCallback((message: string) => setNotice(message), []);
  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(t);
  }, [notice]);

  const clampPanTo = useCallback((x: number, y: number, z: number) => {
    const l = layerRef.current;
    if (!l) return { x, y };
    const maxX = (l.offsetWidth * (z - 1)) / 2;
    const maxY = (l.offsetHeight * (z - 1)) / 2;
    return { x: Math.min(maxX, Math.max(-maxX, x)), y: Math.min(maxY, Math.max(-maxY, y)) };
  }, []);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const step = useCallback(
    (dir: number) => {
      const next = index + dir;
      if (next < 0 || next >= photos.length) return;
      onIndexChange(next);
    },
    [index, photos.length, onIndexChange],
  );

  // ----- reset when the photo changes -----
  useEffect(() => {
    resetView();
    setTagMode(false);
    setPending(null);
    setDragPos(null);
    dragPosRef.current = null;
    setActiveTagId(null);
    setCommentText('');
    setCommentError('');
    setCaptionExpanded(false);
    setFailed(false);
    setLoaded(false);
    setSheetSnap('closed');
    setComments(photo?.comments ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // ----- preload neighbours (never the whole album) -----
  useEffect(() => {
    const neighbours = [photos[index + 1], photos[index - 1]].filter(Boolean) as GalleryPhoto[];
    for (const p of neighbours) {
      const img = new Image();
      img.src = `/api/files/${p.optimizedPath}`;
    }
  }, [index, photos]);

  // ----- comments (fresh copy; inline data paints instantly) -----
  useEffect(() => {
    if (!photo) return;
    let cancelled = false;
    fetch(`/api/photos/${photo.id}/comments`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data.comments)) setComments(data.comments);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [photo]);

  // ----- observe the media layer so tags stay aligned on resize/rotation -----
  useEffect(() => {
    const el = layerRef.current;
    if (!el) return;
    const update = () => setLayer({ w: el.offsetWidth, h: el.offsetHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('orientationchange', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('orientationchange', update);
    };
  }, [photo]);

  // ----- fullscreen tracking -----
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // ----- dialog hygiene: lock the page behind, move focus in, restore it on close -----
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    rootRef.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, []);

  // ----- wheels zoom (stage-local, non-passive) -----
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey && !e.metaKey) return; // leave browser pinch-zoom alone
      e.preventDefault();
      setZoom((z) => clampZoom(e.deltaY < 0 ? z * 1.12 : z / 1.12));
    };
    stage.addEventListener('wheel', onWheel, { passive: false });
    return () => stage.removeEventListener('wheel', onWheel);
  }, [photo]);

  // Keep the zoomed image navigable: clamp pan whenever zoom changes.
  useEffect(() => {
    if (zoom === 1) {
      setPan((p) => (p.x === 0 && p.y === 0 ? p : { x: 0, y: 0 }));
      return;
    }
    setPan((p) => clampPanTo(p.x, p.y, zoom));
  }, [zoom, clampPanTo]);

  // ----- keyboard -----
  const zoomBy = useCallback(
    (dir: 1 | -1) => {
      setZoom((z) => {
        if (dir === 1) return clampZoom(ZOOM_STEPS.find((s) => s > z + 0.001) ?? MAX_ZOOM);
        return clampZoom([...ZOOM_STEPS].reverse().find((s) => s < z - 0.001) ?? MIN_ZOOM);
      });
    },
    [],
  );

  const toggleFullscreen = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else
      el.requestFullscreen?.().catch(() => flash('Fullscreen is not available on this device.'));
  }, [flash]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      if (e.key === 'Escape') {
        if (editOpen) return setEditOpen(false);
        if (menuOpen) return setMenuOpen(false);
        if (pending) return setPending(null);
        if (tagMode) return setTagMode(false);
        if (!isDesktop && sheetSnap !== 'closed') return setSheetSnap('closed');
        if (!typing) onClose();
        return;
      }
      if (typing) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        step(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        step(-1);
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomBy(1);
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        zoomBy(-1);
      } else if (e.key === '0') {
        e.preventDefault();
        resetView();
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editOpen, menuOpen, pending, tagMode, isDesktop, sheetSnap, onClose, step, zoomBy, resetView, toggleFullscreen]);

  // ===== geometry: where the contained image actually sits inside the layer =====
  const draw = useMemo(() => {
    const ratio = photo?.width && photo?.height ? photo.width / photo.height : natural ? natural.w / natural.h : null;
    if (!ratio || !layer.w || !layer.h) return null;
    let dw = layer.w;
    let dh = layer.w / ratio;
    if (dh > layer.h) {
      dh = layer.h;
      dw = layer.h * ratio;
    }
    return { dw, dh, ox: (layer.w - dw) / 2, oy: (layer.h - dh) / 2 };
  }, [photo?.width, photo?.height, natural, layer]);

  const pointToPct = useCallback(
    (clientX: number, clientY: number) => {
      const l = layerRef.current;
      if (!l || !draw || !layer.w || !layer.h) return null;
      const rect = l.getBoundingClientRect();
      const sx = rect.width / layer.w;
      const sy = rect.height / layer.h;
      const left = rect.left + draw.ox * sx;
      const top = rect.top + draw.oy * sy;
      const w = draw.dw * sx;
      const h = draw.dh * sy;
      if (!w || !h) return null;
      const x = ((clientX - left) / w) * 100;
      const y = ((clientY - top) / h) * 100;
      if (x < -4 || x > 104 || y < -4 || y > 104) return null;
      return { x: clampPct(x), y: clampPct(y) };
    },
    [draw, layer.w, layer.h],
  );

  const markerStyle = (tag: PhotoTag) => {
    if (!draw || !layer.w) return { display: 'none' as const };
    const pos = dragPos && dragPos.id === tag.id ? dragPos : { x: tag.x ?? 0, y: tag.y ?? 0 };
    const left = draw.ox + (pos.x / 100) * draw.dw;
    const top = draw.oy + (pos.y / 100) * draw.dh;
    return { left, top };
  };

  // ===== touch gestures =====
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      pinchRef.current = { dist: d, zoom };
      gestureRef.current = null;
      return;
    }
    const t = e.touches[0];
    gestureRef.current = { x: t.clientX, y: t.clientY, at: Date.now(), moved: false, panX: pan.x, panY: pan.y };
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      setZoom(clampZoom(pinchRef.current.zoom * (d / pinchRef.current.dist)));
      return;
    }
    const g = gestureRef.current;
    const t = e.touches[0];
    if (!g || !t) return;
    const dx = t.clientX - g.x;
    const dy = t.clientY - g.y;
    if (Math.hypot(dx, dy) > 8) g.moved = true;
    if (zoom > 1) {
      e.preventDefault();
      setPan(clampPanTo(g.panX + dx, g.panY + dy, zoom));
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (pinchRef.current) {
      pinchRef.current = null;
      gestureRef.current = null;
      return;
    }
    const g = gestureRef.current;
    gestureRef.current = null;
    if (!g) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - g.x;
    const dy = t.clientY - g.y;
    const dt = Date.now() - g.at;

    if (tagMode) {
      // Let the stage click handler place the marker.
      if (g.moved) dragPosRef.current = null;
      return;
    }
    if (!g.moved && dt < 320) {
      // Tap hides/shows the controls; a quick second tap zooms instead.
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        lastTapRef.current = 0;
        setZoom((z) => (z > 1 ? 1 : 2.5));
        return;
      }
      lastTapRef.current = now;
      setControlsVisible((v) => !v);
      return;
    }
    if (zoom === 1 && Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4 && dt < 700) {
      step(dx < 0 ? 1 : -1);
    }
  };

  // ===== mouse drag to pan =====
  const onStagePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || zoom === 1 || tagMode) return;
    setPanning(true);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onStagePointerMove = (e: React.PointerEvent) => {
    if (!panning) return;
    setPan((p) => clampPanTo(p.x + e.movementX, p.y + e.movementY, zoom));
  };
  const onStagePointerUp = () => setPanning(false);

  // ===== stage click: place a tag, or clear an active label =====
  const onStageClick = (e: React.MouseEvent) => {
    if (tagMode) {
      if (!draw) return;
      const p = pointToPct(e.clientX, e.clientY);
      if (p) {
        setPending(p);
        setPickerQuery('');
        setActiveTagId(null);
      }
      return;
    }
    setActiveTagId(null);
  };

  // ===== api actions =====
  async function toggleFavorite() {
    if (!photo || !canEdit || favBusy) return;
    setFavBusy(true);
    const res = await fetch(`/api/photos/${photo.id}/favorite`, { method: 'POST' });
    setFavBusy(false);
    if (!res.ok) return flash('Could not update favorite.');
    const next = !photo.favorite;
    onUpdatePhoto(photo.id, { favorite: next });
    if (next) {
      setHeartPop(true);
      window.setTimeout(() => setHeartPop(false), 420);
    }
  }

  function download() {
    if (!photo) return;
    if (!canDownload) return flash('Download is disabled for this photo.');
    const a = document.createElement('a');
    a.href = `/api/files/${photo.optimizedPath}?download=1`;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function saveTags(payload: Array<{ memberId: string; x?: number | null; y?: number | null }>) {
    if (!photo) return false;
    setTagBusy(true);
    const res = await fetch(`/api/photos/${photo.id}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: payload }),
    });
    const data = await res.json().catch(() => ({}));
    setTagBusy(false);
    if (res.ok && Array.isArray(data.tags)) {
      onUpdatePhoto(photo.id, { tags: data.tags });
      return true;
    }
    flash(data.error || 'Could not save that tag.');
    return false;
  }

  async function removeTag(memberId: string) {
    if (!photo || tagBusy) return;
    setTagBusy(true);
    const res = await fetch(`/api/photos/${photo.id}/tags`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId }),
    });
    const data = await res.json().catch(() => ({}));
    setTagBusy(false);
    if (res.ok && Array.isArray(data.tags)) {
      onUpdatePhoto(photo.id, { tags: data.tags });
      setActiveTagId(null);
    } else {
      flash(data.error || 'Could not remove that tag.');
    }
  }

  async function assignPendingTag(member: LightboxMember) {
    if (!pending) return;
    const ok = await saveTags([{ memberId: member.id, x: pending.x, y: pending.y }]);
    if (ok) {
      setPending(null);
      setPickerQuery('');
    }
  }

  function onMarkerPointerDown(e: React.PointerEvent, tag: PhotoTag) {
    if (!tagMode) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = { id: tag.id, memberId: tag.memberId, moved: false };
    dragPosRef.current = { x: tag.x ?? 0, y: tag.y ?? 0 };
    setActiveTagId(tag.id);
  }

  function onMarkerPointerMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    e.stopPropagation();
    const p = pointToPct(e.clientX, e.clientY);
    if (!p) return;
    d.moved = true;
    dragPosRef.current = p;
    setDragPos({ id: d.id, x: p.x, y: p.y });
  }

  function onMarkerPointerUp(e: React.PointerEvent) {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;
    e.stopPropagation();
    const p = dragPosRef.current;
    setDragPos(null);
    dragPosRef.current = null;
    if (d.moved && p) void saveTags([{ memberId: d.memberId, x: p.x, y: p.y }]);
  }

  async function postComment() {
    if (!photo || !commentText.trim() || commentBusy) return;
    setCommentBusy(true);
    setCommentError('');
    try {
      const res = await fetch(`/api/photos/${photo.id}/comments`, {
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
    if (!photo || busy) return;
    setBusy(true);
    const res = await fetch(`/api/photos/${photo.id}/comments/${commentId}`, { method: 'DELETE' });
    setBusy(false);
    if (res.ok) setComments((prev) => prev.filter((c) => c.id !== commentId));
    else flash('Could not delete that comment.');
  }

  async function deletePhoto() {
    if (!photo || !canManagePhoto) return;
    if (!window.confirm('Delete this photo from the family archive?')) return;
    setBusy(true);
    const res = await fetch(`/api/photos/${photo.id}`, { method: 'DELETE' });
    setBusy(false);
    if (res.ok) onRemovePhoto(photo.id);
    else flash('Could not delete this photo.');
  }

  async function reviewPhoto(action: 'approve' | 'reject') {
    if (!photo || !isAdmin) return;
    setBusy(true);
    const res = await fetch(`/api/photos/${photo.id}/review`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    setBusy(false);
    if (res.ok) {
      onUpdatePhoto(photo.id, { approvalStatus: action === 'approve' ? 'APPROVED' : 'REJECTED' });
      flash(action === 'approve' ? 'Photo approved.' : 'Photo rejected.');
    } else {
      flash('Could not update the review status.');
    }
  }

  // ===== mobile sheet =====
  const sheetBase = useCallback(
    (h: number) => {
      if (sheetSnap === 'full') return 0;
      if (sheetSnap === 'half') return Math.round(h * 0.42);
      return h;
    },
    [sheetSnap],
  );

  function onSheetTouchStart(e: React.TouchEvent) {
    const h = sheetRef.current?.offsetHeight ?? 0;
    sheetTouchRef.current = { startY: e.touches[0].clientY, base: sheetBase(h) };
    setDragY(sheetBase(h));
  }
  function onSheetTouchMove(e: React.TouchEvent) {
    const t = sheetTouchRef.current;
    if (!t) return;
    const h = sheetRef.current?.offsetHeight ?? 0;
    const dy = e.touches[0].clientY - t.startY;
    setDragY(Math.min(h, Math.max(0, t.base + dy)));
  }
  function onSheetTouchEnd() {
    const h = sheetRef.current?.offsetHeight ?? 0;
    const y = dragY ?? sheetBase(h);
    sheetTouchRef.current = null;
    setDragY(null);
    const snaps: Array<['closed' | 'half' | 'full', number]> = [
      ['full', 0],
      ['half', Math.round(h * 0.42)],
      ['closed', h],
    ];
    let best = snaps[0];
    for (const s of snaps) if (Math.abs(s[1] - y) < Math.abs(best[1] - y)) best = s;
    setSheetSnap(best[0]);
  }

  function openSheet(snap: 'half' | 'full') {
    setSheetSnap(snap);
    setDragY(null);
  }

  // ----- early return must come after every hook -----
  if (!mounted || !photo) return null;

  const caption = photo.caption?.trim() || '';
  const longCaption = caption.length > 150;
  const pickerResults = pickerQuery.trim()
    ? members.filter((m) => m.name.toLowerCase().includes(pickerQuery.trim().toLowerCase())).slice(0, 40)
    : members.slice(0, 40);
  const currentOffset = dragY ?? sheetBase(sheetRef.current?.offsetHeight ?? 0);
  const taggedCount = photo.tags.length;

  const rows = (
    <>
      {photo.uploaderName && <DetailRow label="Uploaded by">{photo.uploaderName}</DetailRow>}
      <DetailRow label="Uploaded">{formatRelative(photo.createdAt)}</DetailRow>
      {photo.photoDate && <DetailRow label="Photo date">{formatDate(photo.photoDate)}</DetailRow>}
      {photo.location && (
        <DetailRow label="Location">
          <span className="inline-flex items-center gap-1.5">
            <Icon name="mapPin" className="h-3.5 w-3.5 text-archiveMuted" />
            {photo.location}
          </span>
        </DetailRow>
      )}
      {photo.photographer && <DetailRow label="Photographer">{photo.photographer}</DetailRow>}
      {albumContext && (
        <DetailRow label="Album">
          {albumContext.href ? (
            <Link href={albumContext.href} className="text-archiveTeal hover:underline">
              {albumContext.name}
            </Link>
          ) : (
            albumContext.name
          )}
        </DetailRow>
      )}
      <DetailRow label="Tagged">{taggedCount === 0 ? 'No one yet' : `${taggedCount} ${taggedCount === 1 ? 'person' : 'people'}`}</DetailRow>
    </>
  );

  const panel = (
    <>
      <div className="lb-scroll min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-5 py-5">
        {photo.approvalStatus === 'PENDING' && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-archiveGold/30 bg-archiveGold/15 px-2.5 py-1 text-[11px] font-semibold text-archiveGold">
            <span className="h-1.5 w-1.5 rounded-full bg-archiveGold" /> Pending review
          </span>
        )}
        {photo.approvalStatus === 'REJECTED' && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-archiveMuted">
            Not approved
          </span>
        )}

        {/* Caption */}
        {(caption || photo.description) && (
          <div>
            {caption && (
              <p className={cn('font-display text-[17px] leading-snug text-white', !captionExpanded && longCaption && 'line-clamp-3')}>
                {caption}
              </p>
            )}
            {longCaption && (
              <button
                type="button"
                onClick={() => setCaptionExpanded((v) => !v)}
                className="mt-1 text-xs font-semibold text-archiveTeal hover:underline"
              >
                {captionExpanded ? 'Show less' : 'Read more'}
              </button>
            )}
            {photo.description && (
              <p className="mt-2 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-archiveMuted">
                {photo.description}
              </p>
            )}
          </div>
        )}

        {/* Details */}
        <section>
          <button
            type="button"
            onClick={() => setDetailsOpen((v) => !v)}
            aria-expanded={detailsOpen}
            className="flex w-full items-center justify-between rounded-lg py-1 text-left transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-archiveAccent/60"
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-archiveMuted">Photo details</span>
            <Icon name={detailsOpen ? 'chevronUp' : 'chevronDown'} className="h-4 w-4 text-archiveMuted" />
          </button>
          {detailsOpen && <dl className="mt-3 space-y-2.5">{rows}</dl>}
        </section>

        {/* Tags */}
        <section className="border-t border-white/[0.08] pt-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-archiveMuted">
              Tagged {taggedCount > 0 && <span className="text-white/40">({taggedCount})</span>}
            </span>
            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  setTagMode((v) => !v);
                  setPending(null);
                }}
                className="text-xs font-semibold text-archiveTeal hover:underline"
              >
                {tagMode ? 'Done' : 'Tag people'}
              </button>
            )}
          </div>
          {tagMode && (
            <p className="mt-2 rounded-lg border border-archiveTeal/25 bg-archiveTeal/10 px-3 py-2 text-[12px] text-archiveTeal">
              Click on a person in the photo to tag them.
            </p>
          )}
          {taggedCount === 0 ? (
            <p className="mt-3 text-[13px] text-archiveMuted">No one tagged yet.</p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {photo.tags.map((t) => (
                <span
                  key={t.id}
                  className="group/tag inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.07] py-1 pl-2.5 pr-1.5 text-[12px] font-medium text-white/90"
                >
                  {typeof t.x === 'number' && typeof t.y === 'number' && <Icon name="target" className="h-3 w-3 text-archiveTeal" />}
                  <Link href={`/family/${t.memberId}`} className="max-w-[140px] truncate hover:underline">
                    {t.name}
                  </Link>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => removeTag(t.memberId)}
                      aria-label={`Remove tag ${t.name}`}
                      className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/5 text-white/50 transition hover:bg-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-archiveAccent/60"
                    >
                      <Icon name="x" className="h-2.5 w-2.5" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
        </section>

        {/* Comments */}
        <section className="border-t border-white/[0.08] pt-5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-archiveMuted">
            Comments {comments.length > 0 && <span className="text-white/40">({comments.length})</span>}
          </span>
          {comments.length === 0 ? (
            <p className="mt-3 text-[13px] text-archiveMuted">No comments yet.</p>
          ) : (
            <ul className="mt-3 space-y-4">
              {comments.map((c) => (
                <li key={c.id} className="group/comment flex gap-2.5">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-[10px] font-bold uppercase text-white/70">
                    {c.authorName.slice(0, 1)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-[13px] font-semibold text-white">
                      <span className="truncate">{c.authorName}</span>
                      <span className="shrink-0 text-[11px] font-normal text-white/35">{formatRelative(c.createdAt)}</span>
                    </p>
                    <p className="mt-0.5 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-white/80">
                      {c.body}
                    </p>
                  </div>
                  {(isAdmin || (currentMemberId && c.authorId === currentMemberId)) && (
                    <button
                      type="button"
                      onClick={() => deleteComment(c.id)}
                      aria-label={`Delete comment by ${c.authorName}`}
                      className="h-6 w-6 shrink-0 rounded-md text-white/25 opacity-0 transition hover:bg-white/10 hover:text-white/70 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-archiveAccent/60 group-hover/comment:opacity-100"
                    >
                      <Icon name="trash" className="mx-auto h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Composer pinned so it can never push the viewer out of the viewport */}
      <div className="border-t border-white/[0.08] bg-white/[0.03] p-4">
        {canComment ? (
          <>
            <textarea
              ref={commentInputRef}
              value={commentText}
              onChange={(e) => {
                setCommentText(e.target.value);
                setCommentError('');
              }}
              maxLength={COMMENT_LIMIT}
              rows={2}
              placeholder="Add a comment…"
              aria-label="Add a comment"
              className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-[13px] text-white placeholder:text-white/35 outline-none transition focus:border-archiveAccent/60 focus:ring-1 focus:ring-archiveAccent/40"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void postComment();
                }
              }}
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className={cn('min-w-0 truncate text-[11px]', commentError ? 'text-red-300' : 'text-white/35')}>
                {commentError || `${commentText.length}/${COMMENT_LIMIT}`}
              </span>
              <button
                type="button"
                onClick={() => void postComment()}
                disabled={!commentText.trim() || commentBusy}
                className="shrink-0 rounded-lg bg-archiveAccent px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-archiveAccent/85 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {commentBusy ? 'Posting…' : 'Post'}
              </button>
            </div>
          </>
        ) : canEdit ? (
          // The API attributes comments to a family member, so an unlinked account is read-only.
          <p className="text-xs text-archiveMuted">
            Comments are read-only until your account is linked to a family member.
          </p>
        ) : (
          <p className="text-xs text-archiveMuted">
            <Link href="/login" className="font-semibold text-archiveTeal hover:underline">
              Sign in
            </Link>{' '}
            to add a comment.
          </p>
        )}
      </div>
    </>
  );

  const stage = (
    <div
      ref={stageRef}
      className={cn('relative flex min-h-0 flex-1 select-none items-center justify-center overflow-hidden', 'px-2 py-2 sm:px-10 sm:py-10')}
      style={{ touchAction: 'none' }}
      onClick={onStageClick}
      onDoubleClick={() => setZoom((z) => (z > 1 ? 1 : 2.5))}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onPointerDown={onStagePointerDown}
      onPointerMove={onStagePointerMove}
      onPointerUp={onStagePointerUp}
      onPointerCancel={onStagePointerUp}
    >
      {/* ambient glow from the photo itself */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-25 blur-[80px]"
        style={{ backgroundImage: `url('${thumbUrl}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      />

      <div
        ref={layerRef}
        className="relative h-full w-full"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transition: panning || dragPos ? 'none' : 'transform 180ms ease-out',
        }}
      >
        {!failed && (
          /* Keyed wrapper replays a short fade/slide whenever the photo changes. */
          <div key={photo.id} className="animate-photo-in h-full w-full">
            <img
              key={`${photo.id}-${retryKey}`}
              src={imageUrl}
              alt={caption || 'Family photo'}
              draggable={false}
              onLoad={(e) => {
                setLoaded(true);
                setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight });
              }}
              onError={() => {
                setFailed(true);
                setLoaded(false);
              }}
              className={cn(
                'h-full w-full object-contain transition-opacity duration-200',
                loaded ? 'opacity-100' : 'opacity-0',
                zoom > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in',
              )}
            />
          </div>
        )}

        {/* tag markers */}
        {draw &&
          placedTags.map((t) => {
            const active = activeTagId === t.id || tagMode;
            return (
              <div
                key={t.id}
                className="group/marker absolute z-10 flex items-center"
                style={{ ...markerStyle(t), transform: `translate(-50%, -50%) scale(${1 / zoom})` }}
              >
                <button
                  type="button"
                  onPointerDown={(e) => onMarkerPointerDown(e, t)}
                  onPointerMove={onMarkerPointerMove}
                  onPointerUp={onMarkerPointerUp}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (tagMode) return;
                    setActiveTagId((cur) => (cur === t.id ? null : t.id));
                  }}
                  aria-label={tagMode ? `Drag to move ${t.name}` : `Tagged: ${t.name}`}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full border backdrop-blur-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-archiveTeal/70',
                    tagMode ? 'cursor-grab border-archiveTeal/60 bg-black/70 active:cursor-grabbing' : 'cursor-pointer',
                    !tagMode && (active ? 'border-archiveTeal/50 bg-black/70' : 'border-white/45 bg-black/45'),
                  )}
                >
                  <span className="animate-marker-pop h-2.5 w-2.5 shrink-0 rounded-full bg-archiveTeal ring-2 ring-black/50" />
                </button>
                <Link
                  href={`/family/${t.memberId}`}
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    'ml-1 max-w-[150px] truncate whitespace-nowrap rounded-full border border-white/15 bg-black/75 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-md transition hover:underline',
                    active
                      ? 'opacity-100'
                      : 'pointer-events-none opacity-0 group-hover/marker:pointer-events-auto group-hover/marker:opacity-100 focus:pointer-events-auto focus:opacity-100',
                  )}
                >
                  {t.name}
                </Link>
              </div>
            );
          })}

        {/* pending tag picker */}
        {tagMode && pending && draw && (
          <div
            className="absolute z-30 w-[240px] -translate-x-1/2 translate-y-3"
            style={{
              // Keep the 240px picker inside the stage even when tagging near an edge.
              left: layer.w > 248 ? Math.min(Math.max(draw.ox + (pending.x / 100) * draw.dw, 124), layer.w - 124) : layer.w / 2,
              top: draw.oy + (pending.y / 100) * draw.dh,
              // Flip above the marker when tagging low in the frame so it stays visible.
              transform: `translate(-50%, ${pending.y > 62 ? 'calc(-100% - 12px)' : '12px'}) scale(${1 / zoom})`,
              transformOrigin: pending.y > 62 ? 'bottom center' : 'top center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="overflow-hidden rounded-2xl border border-white/12 bg-[#12141b]/95 shadow-2xl backdrop-blur-xl">
              <div className="border-b border-white/10 p-2.5">
                <input
                  autoFocus
                  value={pickerQuery}
                  onChange={(e) => setPickerQuery(e.target.value)}
                  placeholder="Search family member…"
                  aria-label="Search family member to tag"
                  className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1.5 text-[12px] text-white placeholder:text-white/35 outline-none focus:border-archiveAccent/60"
                />
              </div>
              <div className="lb-scroll max-h-44 overflow-y-auto p-1.5">
                {pickerResults.length === 0 ? (
                  <p className="px-2 py-3 text-center text-[12px] text-archiveMuted">No members found.</p>
                ) : (
                  pickerResults.map((m) => {
                    const already = photo.tags.some((t) => t.memberId === m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        disabled={tagBusy}
                        aria-label={`Tag ${m.name} in this photo`}
                        onClick={() => assignPendingTag(m)}
                        className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-[12px] text-white/90 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-archiveAccent/60 disabled:opacity-50"
                      >
                        <span className="truncate">{m.name}</span>
                        {already && <span className="shrink-0 text-[10px] text-archiveMuted">move tag</span>}
                      </button>
                    );
                  })
                )}
              </div>
              <button
                type="button"
                onClick={() => setPending(null)}
                className="w-full border-t border-white/10 py-2 text-[12px] font-semibold text-archiveMuted transition hover:bg-white/5 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* loading / error states */}
      {!loaded && !failed && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            {thumbUrl && (
              <img src={thumbUrl} alt="" aria-hidden className="max-h-[42vh] max-w-[70vw] rounded-xl object-contain opacity-25 blur-md" />
            )}
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-archiveAccent" aria-hidden />
            <span className="sr-only">Loading photo…</span>
          </div>
        </div>
      )}
      {failed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
          <Icon name="photo" className="h-8 w-8 text-white/30" />
          <p className="text-sm text-white/70">Unable to load photo.</p>
          <button
            type="button"
            onClick={() => {
              setFailed(false);
              setLoaded(false);
              setRetryKey((k) => k + 1);
            }}
            className="rounded-lg border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
          >
            Try again
          </button>
        </div>
      )}

      {/* navigation */}
      {photos.length > 1 && index > 0 && (
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label="Previous photo"
          title="Previous photo"
          className={cn(
            'group absolute left-2 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/10 bg-black/35 p-2.5 text-white/80 backdrop-blur-md transition hover:bg-black/60 hover:text-white sm:left-4',
            !controlsVisible && 'opacity-0',
          )}
        >
          <Icon name="chevronLeft" />
        </button>
      )}
      {photos.length > 1 && index < photos.length - 1 && (
        <button
          type="button"
          onClick={() => step(1)}
          aria-label="Next photo"
          title="Next photo"
          className={cn(
            'group absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/10 bg-black/35 p-2.5 text-white/80 backdrop-blur-md transition hover:bg-black/60 hover:text-white sm:right-4',
            !controlsVisible && 'opacity-0',
          )}
        >
          <Icon name="chevronRight" />
        </button>
      )}

      {/* On phones the info panel lives in a sheet, so surface the tagging hint here. */}
      {tagMode && !isDesktop && (
        <div className="pointer-events-none absolute inset-x-4 top-3 z-30 mx-auto max-w-xs rounded-2xl border border-archiveTeal/30 bg-black/75 px-4 py-2.5 text-center text-[12px] font-medium text-archiveTeal shadow-lg backdrop-blur-xl">
          Tap a person in the photo to tag them.
        </div>
      )}
    </div>
  );

  const zoomPill = (
    <div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/35 px-1 py-1 backdrop-blur-md">
      <ToolButton label="Zoom out" tooltipSide="top" onClick={() => zoomBy(-1)} disabled={zoom <= MIN_ZOOM} className="h-7 w-7 border-transparent bg-transparent">
        <Icon name="zoomOut" className="h-4 w-4" />
      </ToolButton>
      <span className="min-w-[42px] text-center text-[11px] font-semibold tabular-nums text-white/75" aria-live="polite">
        {Math.round(zoom * 100)}%
      </span>
      <ToolButton label="Zoom in" tooltipSide="top" onClick={() => zoomBy(1)} disabled={zoom >= MAX_ZOOM} className="h-7 w-7 border-transparent bg-transparent">
        <Icon name="zoomIn" className="h-4 w-4" />
      </ToolButton>
      <span className="mx-0.5 h-4 w-px bg-white/15" aria-hidden />
      <button
        type="button"
        onClick={resetView}
        aria-label="Fit to screen"
        title="Fit to screen"
        disabled={zoom <= MIN_ZOOM}
        className="rounded-full px-2 py-1 text-[11px] font-semibold text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-archiveAccent/60 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent"
      >
        Fit
      </button>
    </div>
  );

  const topBar = (
    <div
      className={cn(
        'absolute inset-x-0 top-0 z-30 flex items-center gap-2 p-3 transition-opacity duration-200 sm:p-4',
        'bg-gradient-to-b from-black/60 to-transparent',
        !controlsVisible && 'pointer-events-none opacity-0',
      )}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Back to gallery"
        className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.07] py-2 pl-2.5 pr-3.5 text-[13px] font-semibold text-white/90 backdrop-blur-md transition hover:bg-white/[0.16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-archiveAccent/70"
      >
        <Icon name="arrowLeft" className="h-4 w-4" />
        Back
      </button>

      <span
        aria-live="polite"
        className="rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[12px] font-semibold tabular-nums text-white/80 backdrop-blur-md"
      >
        {index + 1} / {photos.length}
      </span>

      {albumContext &&
        (albumContext.href ? (
          <Link
            href={albumContext.href}
            className="hidden min-w-0 items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70 backdrop-blur-md transition hover:border-white/25 hover:text-white md:inline-flex"
          >
            <span className="max-w-[180px] truncate">{albumContext.name}</span>
            {albumContext.total ? <span className="text-white/35">{albumContext.total} photos</span> : null}
          </Link>
        ) : (
          <span className="hidden min-w-0 items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60 backdrop-blur-md md:inline-flex">
            <span className="max-w-[180px] truncate">{albumContext.name}</span>
            {albumContext.total ? <span className="text-white/35">{albumContext.total} photos</span> : null}
          </span>
        ))}

      <div className="ml-auto flex items-center gap-1.5">
        {isDesktop && zoomPill}
        {isDesktop && <span className="mx-0.5 h-5 w-px bg-white/15" aria-hidden />}
        {isDesktop && photos.length > 1 && (
          <ToolButton label={showThumbs ? 'Hide thumbnails' : 'Show thumbnails'} active={showThumbs} onClick={() => setShowThumbs((v) => !v)}>
            <Icon name="grid" className="h-4 w-4" />
          </ToolButton>
        )}
        {/* On phones these live in the bottom action bar; keeping them here too would
            overflow the top bar at 320px. */}
        {isDesktop && (
          <ToolButton label={canDownload ? 'Download' : 'Download unavailable'} onClick={download}>
            <Icon name="download" className="h-4 w-4" />
          </ToolButton>
        )}
        {isDesktop && canEdit && (
          <ToolButton
            label={photo.favorite ? 'Remove from favorites' : 'Add to favorites'}
            active={photo.favorite}
            disabled={favBusy}
            onClick={() => void toggleFavorite()}
          >
            <Icon name="heart" className={cn('h-4 w-4', photo.favorite && 'fill-archiveGold text-archiveGold', heartPop && 'animate-heart-pop')} />
          </ToolButton>
        )}
        {isDesktop && canEdit && (
          <ToolButton
            label="Tag people"
            active={tagMode}
            onClick={() => {
              setTagMode((v) => !v);
              setPending(null);
            }}
          >
            <Icon name="userPlus" className="h-4 w-4" />
          </ToolButton>
        )}
        <ToolButton label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} onClick={toggleFullscreen}>
          <Icon name={isFullscreen ? 'fullscreenExit' : 'fullscreen'} className="h-4 w-4" />
        </ToolButton>
        <div className="relative">
          <ToolButton label="More actions" active={menuOpen} onClick={() => setMenuOpen((v) => !v)}>
            <Icon name="dots" className="h-4 w-4" />
          </ToolButton>
          {menuOpen && (
            <>
              <button
                type="button"
                aria-label="Close menu"
                tabIndex={-1}
                className="fixed inset-0 z-30 cursor-default"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-full z-40 mt-2 w-60 overflow-hidden rounded-2xl border border-white/12 bg-[#12141b]/95 py-1.5 shadow-2xl backdrop-blur-xl">
                <MenuItem icon="download" onClick={() => { setMenuOpen(false); download(); }}>
                  Download
                </MenuItem>
                {canEdit && (
                  <MenuItem icon="heart" onClick={() => { setMenuOpen(false); void toggleFavorite(); }}>
                    {photo.favorite ? 'Remove from favorites' : 'Add to favorites'}
                  </MenuItem>
                )}
                {canEdit && photo.tags.length > 0 && (
                  <MenuItem icon="tag" onClick={() => { setMenuOpen(false); setTagMode(true); }}>
                    Manage tags
                  </MenuItem>
                )}
                {albumContext?.href && (
                  <MenuItem icon="folder" onClick={() => setMenuOpen(false)} href={albumContext.href}>
                    View album
                  </MenuItem>
                )}
                {canManagePhoto && (
                  <MenuItem icon="edit" onClick={() => { setMenuOpen(false); setEditOpen(true); }}>
                    Edit details
                  </MenuItem>
                )}
                <MenuItem icon={isFullscreen ? 'fullscreenExit' : 'fullscreen'} onClick={() => { setMenuOpen(false); toggleFullscreen(); }}>
                  {isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                </MenuItem>

                {isAdmin && photo.approvalStatus === 'PENDING' && (
                  <div className="mt-1 border-t border-white/10 pt-1">
                    <MenuItem icon="check" onClick={() => { setMenuOpen(false); void reviewPhoto('approve'); }}>
                      Approve photo
                    </MenuItem>
                    <MenuItem icon="x" onClick={() => { setMenuOpen(false); void reviewPhoto('reject'); }}>
                      Reject photo
                    </MenuItem>
                  </div>
                )}

                {canManagePhoto && (
                  <div className="mt-1 border-t border-white/10 pt-1">
                    <MenuItem icon="trash" danger onClick={() => { setMenuOpen(false); void deletePhoto(); }}>
                      Delete photo
                    </MenuItem>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  const thumbs =
    isDesktop && showThumbs && photos.length > 1 ? (
      <div className="relative z-20 shrink-0 border-t border-white/[0.08] bg-black/30 backdrop-blur-md">
        <div className="lb-scroll flex items-center gap-2 overflow-x-auto px-4 py-2.5">
          {photos.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onIndexChange(i)}
              aria-label={`View photo ${i + 1}`}
              aria-current={i === index}
              className={cn(
                'relative h-12 w-16 shrink-0 overflow-hidden rounded-lg border transition',
                i === index ? 'border-archiveAccent opacity-100 ring-2 ring-archiveAccent/40' : 'border-white/10 opacity-55 hover:opacity-90',
              )}
            >
              <img src={`/api/files/${p.thumbPath}`} alt="" loading="lazy" draggable={false} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      </div>
    ) : null;

  const fullscreenPanelOpen = isDesktop && !isFullscreen;

  const mobileBar = !isDesktop ? (
    <div
      className={cn(
        'absolute inset-x-0 bottom-0 z-30 transition-opacity duration-200',
        sheetSnap !== 'closed' && 'pointer-events-none opacity-0',
        !controlsVisible && 'pointer-events-none opacity-0',
      )}
      onTouchStart={(e) => {
        const t = e.touches[0];
        barSwipeRef.current = { y: t.clientY, moved: false };
      }}
      onTouchMove={(e) => {
        const s = barSwipeRef.current;
        if (!s) return;
        if (s.y - e.touches[0].clientY > 14) s.moved = true;
      }}
      onTouchEnd={() => {
        const s = barSwipeRef.current;
        barSwipeRef.current = null;
        if (s?.moved) openSheet('half');
      }}
    >
      <div className="mx-3 mb-3 flex items-center justify-around rounded-2xl border border-white/10 bg-black/45 px-1.5 py-2 backdrop-blur-xl">
        <MobileAction
          label={photo.favorite ? 'Favorited' : 'Favorite'}
          active={photo.favorite}
          onClick={() => (canEdit ? void toggleFavorite() : flash('Sign in to save favorites.'))}
        >
          <Icon name="heart" className={cn('h-5 w-5', photo.favorite && 'fill-archiveGold text-archiveGold', heartPop && 'animate-heart-pop')} />
        </MobileAction>
        <MobileAction
          label="Tag"
          active={tagMode}
          onClick={() => {
            if (!canEdit) return flash('Sign in to tag people.');
            setTagMode((v) => !v);
            setPending(null);
          }}
        >
          <Icon name="userPlus" className="h-5 w-5" />
        </MobileAction>
        <MobileAction label="Comment" badge={comments.length || undefined} onClick={() => { openSheet('half'); window.setTimeout(() => commentInputRef.current?.focus(), 320); }}>
          <Icon name="messageCircle" className="h-5 w-5" />
        </MobileAction>
        <MobileAction label="Download" onClick={download}>
          <Icon name="download" className="h-5 w-5" />
        </MobileAction>
        <MobileAction label="Info" onClick={() => openSheet('half')}>
          <Icon name="info" className="h-5 w-5" />
        </MobileAction>
      </div>
    </div>
  ) : null;

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Photo ${index + 1} of ${photos.length}`}
      tabIndex={-1}
      className="photo-lightbox fixed inset-0 z-[70] flex bg-archiveDeep text-white outline-none animate-fade-in"
    >
      <div className="relative flex min-w-0 flex-1 flex-col">
        {topBar}
        {stage}
        {thumbs}
        {mobileBar}
      </div>

      {fullscreenPanelOpen && (
        <aside
          className="m-3 ml-0 flex w-[336px] shrink-0 flex-col overflow-hidden rounded-3xl border border-white/[0.12] bg-white/[0.06] shadow-2xl backdrop-blur-2xl xl:w-[372px]"
          aria-label="Photo information"
        >
          <header className="flex items-center justify-between gap-2 border-b border-white/[0.08] px-5 py-3.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-archiveMuted">Information</span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close viewer"
              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-archiveAccent/60"
            >
              <Icon name="x" className="h-4 w-4" />
            </button>
          </header>
          {panel}
        </aside>
      )}

      {/* Mobile bottom sheet */}
      {!isDesktop && (
        <div
          ref={sheetRef}
          className="fixed inset-x-0 bottom-0 z-[80] flex h-[88vh] flex-col rounded-t-3xl border-t border-white/[0.12] bg-[#12141b]/95 shadow-2xl backdrop-blur-2xl"
          style={{
            transform: `translateY(${currentOffset}px)`,
            transition: dragY === null ? 'transform 280ms cubic-bezier(0.32, 0.72, 0, 1)' : 'none',
            visibility: sheetSnap === 'closed' && dragY === null ? 'hidden' : 'visible',
          }}
          role="dialog"
          aria-modal="false"
          aria-label="Photo details"
          aria-hidden={sheetSnap === 'closed'}
        >
          <div
            className="shrink-0 cursor-grab touch-none px-4 pb-1 pt-3 active:cursor-grabbing"
            onTouchStart={onSheetTouchStart}
            onTouchMove={onSheetTouchMove}
            onTouchEnd={onSheetTouchEnd}
            onClick={() => setSheetSnap((s) => (s === 'full' ? 'half' : 'full'))}
          >
            <span className="mx-auto block h-1.5 w-12 rounded-full bg-white/25" aria-hidden />
            <div className="mt-2.5 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-archiveMuted">Photo details</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setSheetSnap('closed'); }}
                  aria-label="Close details"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-archiveAccent/60"
                >
                  <Icon name="x" className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          {panel}
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="pointer-events-none fixed inset-x-4 bottom-24 z-[90] mx-auto max-w-sm rounded-xl border border-white/12 bg-black/85 px-4 py-2.5 text-center text-[13px] font-medium text-white shadow-2xl backdrop-blur-xl sm:bottom-8"
        >
          {notice}
        </div>
      )}

      {editOpen && (
        <EditDetailsModal
          photo={photo}
          onClose={() => setEditOpen(false)}
          onSaved={(patch) => {
            onUpdatePhoto(photo.id, patch);
            setEditOpen(false);
            flash('Photo details updated.');
          }}
        />
      )}
    </div>
  );
}

function MenuItem({
  icon,
  children,
  onClick,
  href,
  danger,
}: {
  icon: string;
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
}) {
  const cls = cn(
    'flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] transition',
    danger ? 'text-red-300 hover:bg-red-500/15' : 'text-white/85 hover:bg-white/10 hover:text-white',
  );
  if (href) {
    return (
      <Link href={href} className={cls} onClick={onClick}>
        <Icon name={icon} className="h-4 w-4 opacity-80" />
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      <Icon name={icon} className="h-4 w-4 opacity-80" />
      {children}
    </button>
  );
}

function MobileAction({
  label,
  children,
  onClick,
  active,
  badge,
}: {
  label: string;
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'relative flex min-w-[54px] flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-semibold transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-archiveAccent/70',
        active ? 'text-archiveGold' : 'text-white/80 hover:bg-white/10 hover:text-white',
      )}
    >
      {children}
      <span>{label}</span>
      {badge ? (
        <span className="absolute -top-0.5 right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-archiveAccent px-1 text-[9px] font-bold text-white">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function EditDetailsModal({
  photo,
  onClose,
  onSaved,
}: {
  photo: GalleryPhoto;
  onClose: () => void;
  onSaved: (patch: Partial<GalleryPhoto>) => void;
}) {
  const [caption, setCaption] = useState(photo.caption ?? '');
  const [description, setDescription] = useState(photo.description ?? '');
  const [location, setLocation] = useState(photo.location ?? '');
  const [photographer, setPhotographer] = useState(photo.photographer ?? '');
  const [photoDate, setPhotoDate] = useState(photo.photoDate ? photo.photoDate.slice(0, 10) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    if (saving) return;
    setSaving(true);
    setError('');
    const res = await fetch(`/api/photos/${photo.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caption,
        description,
        location,
        photographer,
        photoDate: photoDate || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (res.ok) {
      onSaved({
        caption: caption.trim() || null,
        description: description.trim() || null,
        location: location.trim() || null,
        photographer: photographer.trim() || null,
        photoDate: photoDate ? new Date(photoDate).toISOString() : null,
      });
    } else {
      setError(data.error || 'Could not save changes.');
    }
  }

  const field = 'w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-[13px] text-white placeholder:text-white/35 outline-none transition focus:border-archiveAccent/60 focus:ring-1 focus:ring-archiveAccent/40';

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
      <button type="button" aria-label="Close editor" className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edit photo details"
        className="relative z-10 max-h-[88vh] w-full max-w-md overflow-y-auto rounded-3xl border border-white/[0.12] bg-[#12141b]/95 p-5 shadow-2xl backdrop-blur-2xl lb-scroll"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-white">Edit photo details</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3.5">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-archiveMuted">Caption</span>
            <input value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={300} className={field} placeholder="Family Reunion Dinner" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-archiveMuted">Description</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={2000} className={cn(field, 'resize-none')} placeholder="Three generations together again." />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-archiveMuted">Photo date</span>
              <input type="date" value={photoDate} onChange={(e) => setPhotoDate(e.target.value)} className={field} />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-archiveMuted">Photographer</span>
              <input value={photographer} onChange={(e) => setPhotographer(e.target.value)} maxLength={120} className={field} placeholder="Someone in the family" />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-archiveMuted">Location</span>
            <input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={160} className={field} placeholder="Cebu City" />
          </label>
        </div>

        {error && <p className="mt-3 text-[12px] text-red-300">{error}</p>}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-white/12 px-4 py-2 text-[13px] font-semibold text-white/80 transition hover:bg-white/10">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="rounded-xl bg-archiveAccent px-4 py-2 text-[13px] font-bold text-white transition hover:bg-archiveAccent/85 disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
