'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Icon } from './icons';
import { cn, formatRelative } from '@/lib/utils';

type Notif = {
  id: string;
  title: string;
  body?: string | null;
  link?: string | null;
  createdAt: string;
  readAt?: string | null;
};

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  async function load(signal?: AbortSignal) {
    try {
      const res = await fetch('/api/notifications?limit=6', { signal });
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.items || []);
      setUnread(data.unread || 0);
    } catch {
      // A background poll must never surface as an unhandled error: the request can fail
      // while the dev server restarts, while offline, or when the component unmounts.
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    const id = setInterval(() => void load(controller.signal), 60_000);
    return () => {
      controller.abort();
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  async function markAllRead() {
    try {
      await fetch('/api/notifications/read', { method: 'POST' });
    } catch {
      return;
    }
    setUnread(0);
    setItems((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          setOpen((o) => !o);
          if (!open) void load();
        }}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl text-inkSoft transition hover:bg-parchment hover:text-goldDeep"
        aria-label="Notifications"
      >
        <Icon name="bell" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rust px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-line/60 bg-white shadow-lift animate-fade-in sm:w-96">
          <div className="flex items-center justify-between border-b border-line/60 px-4 py-3">
            <h3 className="font-display text-sm font-bold">Notifications</h3>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs font-semibold text-goldDeep hover:text-gold">Mark all read</button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-inkSoft">No notifications yet.</p>
            )}
            {items.map((n) => {
              const inner = (
                <div className={cn('flex gap-3 px-4 py-3 transition hover:bg-parchment/50', !n.readAt && 'bg-gold/5')}>
                  <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.readAt ? 'bg-line' : 'bg-gold')} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-snug text-ink">{n.title}</p>
                    {n.body && <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-inkSoft">{n.body}</p>}
                    <p className="mt-1 text-[11px] text-inkSoft/70">{formatRelative(n.createdAt)}</p>
                  </div>
                </div>
              );
              return n.link ? (
                <Link key={n.id} href={n.link} onClick={() => setOpen(false)}>{inner}</Link>
              ) : (
                <div key={n.id}>{inner}</div>
              );
            })}
          </div>
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-line/60 px-4 py-2.5 text-center text-xs font-semibold text-goldDeep hover:bg-parchment/50"
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}