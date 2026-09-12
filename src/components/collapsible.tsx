import { Icon } from './icons';

// Collapsible section built on native <details>/<summary> — accessible,
// keyboard-friendly, works without JavaScript, and collapses on small screens
// while staying open on desktop via the `lg:` variant below.
export function Collapsible({
  title,
  count,
  defaultOpen = true,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-2xl border border-line/60 bg-white shadow-card lg:open:[&>summary_.chevron]:hidden"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 lg:cursor-default lg:list-none [&::-webkit-details-marker]:hidden">
        <h3 className="font-display text-base font-bold text-ink">
          {title} {count !== undefined && <span className="text-sm font-normal text-inkSoft">({count})</span>}
        </h3>
        <span className="chevron flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-parchment text-inkSoft transition group-open:rotate-180 lg:hidden">
          <Icon name="chevronRight" className="h-4 w-4" />
        </span>
      </summary>
      <div className="px-5 pb-5">{children}</div>
    </details>
  );
}