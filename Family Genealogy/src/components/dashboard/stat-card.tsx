import Link from 'next/link';
import { Icon } from '@/components/icons';

type StatCardProps = {
  label: string;
  value: number | string;
  href: string;
  icon: string;
  iconBg: string;
  trend?: string;
  trendColor?: string;
};

export function StatCard({ label, value, href, icon, iconBg, trend, trendColor = 'text-sage' }: StatCardProps) {
  return (
    <Link href={href} className="card group p-4 transition hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-display text-3xl font-bold text-ink">{value}</p>
          <p className="mt-1 text-xs font-semibold text-inkSoft">{label}</p>
          {trend && (
            <p className={`mt-1 text-xs font-semibold ${trendColor}`}>{trend}</p>
          )}
        </div>
        <div className={`stat-card-icon ${iconBg} text-current`}>
          <Icon name={icon} className="h-6 w-6" />
        </div>
      </div>
    </Link>
  );
}
