'use client';

import { useRouter } from 'next/navigation';
import { Icon } from './icons';

export function MarkAllRead() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        try {
          await fetch('/api/notifications/read', { method: 'POST' });
        } catch {
          return;
        }
        router.refresh();
      }}
      className="btn-ghost text-xs"
    >
      <Icon name="check" className="h-3.5 w-3.5" /> Mark all read
    </button>
  );
}