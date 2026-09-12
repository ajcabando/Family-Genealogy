import Link from 'next/link';
import { formatDate, cn } from '@/lib/utils';
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
    <Link
      href={`/reunions/${id}`}
      className="card group block overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-navy">
        {coverPhoto ? (
          <img
            src={coverPhoto}
            alt={name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-navy via-navyLight to-primary/70">
            <Icon name="calendar" className="h-10 w-10 text-white/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-navyDeep/85 via-navyDeep/25 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur">
            Upcoming
          </span>
          <p className="mt-2 truncate font-display text-base font-bold text-white">{name}</p>
        </div>
      </div>
      <div className="flex items-start gap-3 p-4">
        <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-accentPurpleSoft text-primary">
          <span className="text-[10px] font-bold uppercase leading-none">{dateObj.format('MMM')}</span>
          <span className="text-lg font-bold leading-tight">{dateObj.format('DD')}</span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-xs text-subtext">
            <Icon name="calendar" className="h-3.5 w-3.5 shrink-0" />
            {formatDate(date)}
          </p>
          {location && (
            <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-subtext">
              <Icon name="mapPin" className="h-3.5 w-3.5 shrink-0" />
              {location}
            </p>
          )}
          <p className={cn('mt-2 text-xs font-semibold text-primary')}>View event →</p>
        </div>
      </div>
    </Link>
  );
}
