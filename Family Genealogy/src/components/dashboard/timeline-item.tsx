import { formatDate } from '@/lib/utils';
import { Icon } from '@/components/icons';

type TimelineItemProps = {
  title: string;
  date: Date;
  icon?: string;
  iconBg?: string;
};

const ICON_STYLES: Record<string, { bg: string; color: string }> = {
  reunion: { bg: 'bg-sage/15', color: 'text-sage' },
  birth: { bg: 'bg-blue-100', color: 'text-blue-600' },
  death: { bg: 'bg-red-100', color: 'text-red-600' },
  marriage: { bg: 'bg-purple-100', color: 'text-purple-600' },
  default: { bg: 'bg-navyAccent/10', color: 'text-navyAccent' },
};

export function TimelineItem({ title, date, icon = 'calendar', iconBg }: TimelineItemProps) {
  const style = ICON_STYLES[iconBg || 'default'] || ICON_STYLES.default;
  
  return (
    <li className="relative flex items-start gap-3">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${style.bg} ${style.color}`}>
        <Icon name={icon} className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1 pb-4">
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="text-xs text-inkSoft">{formatDate(date)}</p>
      </div>
    </li>
  );
}
