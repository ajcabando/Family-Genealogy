import Link from 'next/link';
import { Icon } from '@/components/icons';
import { cn } from '@/lib/utils';

export type AlbumItem = {
  id: string;
  name: string;
  photoCount: number;
  coverThumb: string | null;
};

export function AlbumsSection({ albums, full = false }: { albums: AlbumItem[]; full?: boolean }) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-ink">Albums</h2>
        <Link href="/photos?view=albums" className="text-xs font-semibold text-navyAccent hover:underline">
          View all albums
        </Link>
      </div>

      {albums.length === 0 ? (
        <p className="rounded-2xl border border-line/60 bg-white px-4 py-6 text-sm text-inkSoft">
          No albums yet — photos can be grouped into albums from the 2026 reunion.
        </p>
      ) : (
        <div
          className={cn(
            'flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory',
            full && 'flex-wrap overflow-x-visible pb-0 snap-none sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
          )}
        >
          {albums.map((album) => (
            <Link
              key={album.id}
              href={`/photos?album=${album.id}`}
              className={cn(
                'group relative w-52 shrink-0 snap-start overflow-hidden rounded-2xl border border-line/60 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift',
                full && 'w-full sm:w-auto',
              )}
            >
              <div className="aspect-[4/3] overflow-hidden bg-parchment">
                {album.coverThumb ? (
                  <img
                    src={album.coverThumb}
                    alt={album.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-inkSoft/40">
                    <Icon name="photo" className="h-8 w-8" />
                  </div>
                )}
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 via-ink/50 to-transparent p-3 pt-8">
                <p className="flex items-center gap-1 text-xs font-bold text-white">
                  <Icon name="photo" className="h-3 w-3" />
                  {album.name}
                </p>
                <p className="mt-0.5 text-[11px] text-white/80">{album.photoCount} photos</p>
              </div>
              <span className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/85 text-inkSoft shadow-card transition group-hover:bg-navyAccent group-hover:text-white">
                <Icon name="chevronRight" className="h-4 w-4" />
              </span>
            </Link>
          ))}

          {/* "View all albums" card */}
          <Link
            href="/photos?view=albums"
            className="flex w-52 shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-white/60 py-8 text-inkSoft transition hover:border-navyAccent hover:text-navyAccent"
          >
            <Icon name="folder" className="h-7 w-7" />
            <span className="text-xs font-semibold">View all albums →</span>
          </Link>
        </div>
      )}
    </section>
  );
}