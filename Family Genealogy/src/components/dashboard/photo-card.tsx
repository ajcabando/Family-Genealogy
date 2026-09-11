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
    <Link href={`/photos?photo=${id}`} className="photo-card group">
      <div className="aspect-square overflow-hidden rounded-xl border border-line/60">
        <img
          src={photoUrl({ optimizedPath, thumbPath }, 'full')}
          alt={caption || 'Family photo'}
          loading="lazy"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
      </div>
      <div className="mt-2">
        <p className="text-sm font-semibold text-ink truncate">{caption || 'Family photo'}</p>
        <p className="text-xs text-inkSoft">{formatDate(displayDate)}</p>
      </div>
    </Link>
  );
}
