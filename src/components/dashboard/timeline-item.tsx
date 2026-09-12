import { formatDate, cn } from '@/lib/utils';
import { Icon } from '@/components/icons';

type TimelineItemProps = {
  title: string;
  date: Date;
  icon?: string;
  iconBg?: string;
};

const ICON_STYLES: Record<string, { bg: string; color: string }> = {
  reunion: { bg: 'bg-accentTeal/15', color: 'text-accentTeal' },
  birth: { bg: 'bg-accentBlueSoft', color: 'text-accentBlue' },
  death: { bg: 'bg-accentCoralSoft', color: 'text-accentCoral' },
  marriage: { bg: 'bg-accentPurpleSoft', color: 'text-primary' },
  default: { bg: 'bg-appBg', color: 'text-subtext' },
};

export function TimelineItem({ title, date, icon = 'calendar', iconBg }: TimelineItemProps) {
  const style = ICON_STYLES[iconBg || 'default'] || ICON_STYLES.default;

  return (
    <li className="relative flex items-start gap-3">
      <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', style.bg, style.color)}>
        <Icon name={icon} className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1 pb-4">
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="text-xs text-subtext">{formatDate(date)}</p>
      </div>
    </li>
  );
}
