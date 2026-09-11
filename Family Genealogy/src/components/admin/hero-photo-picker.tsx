'use client';

import { useState, useEffect } from 'react';
import { Icon } from '../icons';
import { photoUrl } from '@/lib/utils';

type PickerPhoto = {
  id: string;
  caption: string | null;
  thumbPath: string;
  optimizedPath: string | null;
};

export function HeroPhotoPicker({
  open,
  onClose,
  onSelect,
  title,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (photoId: string, imagePath: string) => void;
  title: string;
}) {
  const [photos, setPhotos] = useState<PickerPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPhotos([]);
    setPage(1);
    setHasMore(true);
    loadPhotos(1);
  }, [open]);

  async function loadPhotos(p: number) {
    setLoading(true);
    try {
      const res = await fetch(`/api/photos?scope=all&limit=30&page=${p}`);
      if (res.ok) {
        const data = await res.json();
        setPhotos((prev) => (p === 1 ? data.photos : [...prev, ...data.photos]));
        setHasMore(data.hasMore);
      }
    } catch {
      // Leave the grid as-is; a failed page just stops loading more.
    } finally {
      setLoading(false);
    }
  }

  async function pickPhoto(photo: PickerPhoto) {
    setSelecting(photo.id);
    const imagePath = photo.optimizedPath || photo.thumbPath;
    onSelect(photo.id, imagePath);
    setSelecting(null);
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/40 p-4 animate-fade-in" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-lift animate-fade-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
            <p className="text-xs text-inkSoft">Select a photo from the gallery</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-inkSoft hover:bg-parchment">
            <Icon name="x" />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-4">
          {photos.length === 0 && !loading ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Icon name="photo" className="h-10 w-10 text-inkSoft/30" />
              <p className="text-sm text-inkSoft">No photos uploaded yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {photos.map((photo) => {
                const src = photoUrl(photo, 'thumb');
                return (
                  <button
                    key={photo.id}
                    onClick={() => pickPhoto(photo)}
                    disabled={selecting !== null}
                    className="group relative aspect-square overflow-hidden rounded-xl border-2 border-transparent bg-parchment transition hover:border-goldDeep disabled:opacity-50"
                  >
                    <img
                      src={src}
                      alt={photo.caption || 'Photo'}
                      loading="lazy"
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-ink/0 transition group-hover:bg-ink/20">
                      {selecting === photo.id ? (
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <Icon name="check" className="h-6 w-6 text-white opacity-0 transition group-hover:opacity-100" />
                      )}
                    </div>
                    {photo.caption && (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/70 to-transparent px-2 py-1.5">
                        <p className="truncate text-[10px] font-semibold text-white">{photo.caption}</p>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {loading && (
            <div className="flex justify-center py-6">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-goldDeep border-t-transparent" />
            </div>
          )}

          {hasMore && !loading && photos.length > 0 && (
            <div className="flex justify-center pt-4">
              <button onClick={() => { setPage((p) => p + 1); loadPhotos(page + 1); }} className="btn-ghost text-xs">
                Load more photos
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
