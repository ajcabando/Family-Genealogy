import Link from 'next/link';
import { Icon } from '@/components/icons';
import { formatRelative, cn } from '@/lib/utils';

type ActivityItemProps = {
  type: 'upload' | 'update' | 'add' | 'tag' | 'approval';
  message: string;
  detail?: string;
  timestamp: Date;
  /** Optional destination so the row is actionable. */
  href?: string;
};

const ICON_MAP: Record<string, { icon: string; bg: string; color: string }> = {
  upload: { icon: 'photo', bg: 'bg-accentPurpleSoft', color: 'text-primary' },
  update: { icon: 'edit', bg: 'bg-accentGreenSoft', color: 'text-accentGreen' },
  add: { icon: 'userPlus', bg: 'bg-accentBlueSoft', color: 'text-accentBlue' },
  tag: { icon: 'tag', bg: 'bg-accentMint', color: 'text-accentTeal' },
  approval: { icon: 'check', bg: 'bg-accentGoldSoft', color: 'text-goldDeep' },
};

export function ActivityItem({ type, message, detail, timestamp, href }: ActivityItemProps) {
  const { icon, bg, color } = ICON_MAP[type] || ICON_MAP.upload;

  const body = (
    <>
      <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', bg, color)}>
        <Icon name={icon} className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-ink">{message}</span>
        {detail && <span className="block truncate text-xs text-subtext">{detail}</span>}
        <span className="mt-0.5 block text-[11px] text-subtext/70">{formatRelative(timestamp)}</span>
      </span>
    </>
  );

  const base = 'flex items-start gap-3 py-2';
  if (href) {
    return (
      <Link
        href={href}
        className={cn(base, '-mx-2 rounded-xl px-2 transition hover:bg-appBg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35')}
      >
        {body}
      </Link>
    );
  }
  return <div className={base}>{body}</div>;
}
