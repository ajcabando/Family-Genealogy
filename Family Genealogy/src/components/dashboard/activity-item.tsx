import { Icon } from '@/components/icons';
import { formatRelative } from '@/lib/utils';

type ActivityItemProps = {
  type: 'upload' | 'update' | 'add' | 'tag' | 'approval';
  message: string;
  detail?: string;
  timestamp: Date;
};

const ICON_MAP: Record<string, { icon: string; bg: string; color: string }> = {
  upload: { icon: 'photo', bg: 'bg-navyAccent/10', color: 'text-navyAccent' },
  update: { icon: 'edit', bg: 'bg-green-100', color: 'text-green-600' },
  add: { icon: 'plus', bg: 'bg-orange-100', color: 'text-orange-600' },
  tag: { icon: 'user', bg: 'bg-purple-100', color: 'text-purple-600' },
  approval: { icon: 'check', bg: 'bg-sage/15', color: 'text-sage' },
};

export function ActivityItem({ type, message, detail, timestamp }: ActivityItemProps) {
  const { icon, bg, color } = ICON_MAP[type] || ICON_MAP.upload;
  
  return (
    <div className="flex items-start gap-3 py-2">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${bg} ${color}`}>
        <Icon name={icon} className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-ink">{message}</p>
        {detail && <p className="text-xs text-inkSoft">{detail}</p>}
        <p className="text-xs text-inkSoft/70 mt-0.5">{formatRelative(timestamp)}</p>
      </div>
    </div>
  );
}
