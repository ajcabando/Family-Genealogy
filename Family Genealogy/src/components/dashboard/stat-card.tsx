import Link from 'next/link';
import { Icon } from '@/components/icons';
import { cn } from '@/lib/utils';

type StatCardProps = {
  label: string;
  value: number | string;
  href: string;
  icon: string;
  /** Accent chip classes, e.g. `chip-purple`. */
  iconBg: string;
  trend?: string;
  trendColor?: string;
};

export function StatCard({ label, value, href, icon, iconBg, trend, trendColor }: StatCardProps) {
  return (
    <Link
      href={href}
      className="card group flex flex-col gap-3 p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
    >
      <span className={cn('chip h-10 w-10', iconBg)}>
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="font-display text-2xl font-bold leading-none text-ink tabular-nums">{value}</p>
        <p className="mt-1.5 truncate text-xs font-semibold text-subtext">{label}</p>
        {trend && (
          <p className={cn('mt-1 truncate text-[11px] font-semibold', trendColor || 'text-subtext')}>{trend}</p>
        )}
      </div>
    </Link>
  );
}
