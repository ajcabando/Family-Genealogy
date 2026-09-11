import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { Icon } from '@/components/icons';
import dayjs from 'dayjs';

type ReunionCardProps = {
  id: string;
  name: string;
  date: Date;
  location?: string | null;
  coverPhoto?: string | null;
};

export function ReunionCard({ id, name, date, location, coverPhoto }: ReunionCardProps) {
  const dateObj = dayjs(date);
  
  return (
    <Link href={`/reunions/${id}`} className="card overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lift">
      {coverPhoto && (
        <div className="aspect-video overflow-hidden">
          <img
            src={coverPhoto}
            alt={name}
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-navyAccent/10 text-navyAccent">
            <div className="text-center">
              <p className="text-xs font-bold uppercase">{dateObj.format('MMM')}</p>
              <p className="text-lg font-bold leading-none">{dateObj.format('DD')}</p>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-bold text-ink truncate">{name}</p>
            <p className="flex items-center gap-1 text-xs text-inkSoft mt-0.5">
              <Icon name="calendar" className="h-3 w-3" />
              {formatDate(date)}
            </p>
            {location && (
              <p className="flex items-center gap-1 text-xs text-inkSoft mt-0.5">
                <Icon name="mapPin" className="h-3 w-3" />
                {location}
              </p>
            )}
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <span className="text-xs font-semibold text-navyAccent">View Event →</span>
        </div>
      </div>
    </Link>
  );
}
