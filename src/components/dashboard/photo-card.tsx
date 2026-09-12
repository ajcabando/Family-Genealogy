import Link from 'next/link';
import { formatDate, photoUrl } from '@/lib/utils';

type PhotoCardProps = {
  id: string;
  caption?: string | null;
  photoDate?: Date | null;
  createdAt: Date;
  optimizedPath?: string | null;
  thumbPath?: string | null;
};

export function PhotoCard({ id, caption, photoDate, createdAt, optimizedPath, thumbPath }: PhotoCardProps) {
  const displayDate = photoDate || createdAt;

  return (
    <Link
      href={`/photos?photo=${id}`}
      className="photo-card group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 rounded-2xl"
    >
      <div className="overflow-hidden rounded-2xl border border-line/70 bg-appBg shadow-card">
        <div className="aspect-square overflow-hidden">
          <img
            src={photoUrl({ optimizedPath, thumbPath }, 'full')}
            alt={caption || 'Family photo'}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
          />
        </div>
      </div>
      <div className="mt-2 min-w-0">
        <p className="truncate text-sm font-semibold text-ink">{caption || 'Family photo'}</p>
        <p className="truncate text-xs text-subtext">{formatDate(displayDate)}</p>
      </div>
    </Link>
  );
}
