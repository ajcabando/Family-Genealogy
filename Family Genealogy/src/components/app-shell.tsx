'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Icon } from './icons';
import { NotificationsBell } from './notifications';
import { cn } from '@/lib/utils';

type Session = {
  name: string;
  email: string;
  role: 'ADMIN' | 'MEMBER';
};

const NAV = [
  { href: '/', label: 'Dashboard', icon: 'home' },
  { href: '/tree', label: 'Family Tree', icon: 'tree' },
  { href: '/family', label: 'Family', icon: 'users' },
  { href: '/photos', label: 'Photos', icon: 'photo' },
  { href: '/reunions', label: 'Reunions', icon: 'calendar' },
  { href: '/timeline', label: 'Timeline', icon: 'clock' },
  { href: '/profile', label: 'My Profile', icon: 'user' },
  { href: '/contributions', label: 'Contributions', icon: 'inbox' },
];

export function AppShell({ session, familyName, children }: { session: Session; familyName: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = session.role === 'ADMIN';
  const [mobileOpen, setMobileOpen] = useState(false);

  const items = [...NAV, ...(isAdmin ? [{ href: '/admin', label: 'Admin', icon: 'shield' as string }] : [])];

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="min-h-screen">
      {/* ---------- Desktop sidebar ---------- */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-line/60 bg-white/70 backdrop-blur lg:flex">
        <Link href="/" className="flex items-center gap-3 px-5 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-goldDeep text-white shadow-card">
            <Icon name="tree" className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <p className="font-display text-base font-bold text-ink">{familyName}</p>
            <p className="text-[11px] uppercase tracking-widest text-inkSoft/70">Family Archive</p>
          </div>
        </Link>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
          {items.map((item) => {
            const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
                  active ? 'bg-goldDeep text-white shadow-card' : 'text-inkSoft hover:bg-parchment hover:text-goldDeep',
                )}
              >
                <Icon name={item.icon} className="h-[18px] w-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-line/60 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/20 font-display text-sm font-bold text-goldDeep">
              {(session.name || session.email || '?').slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-semibold">{session.name || session.email}</p>
              <p className="text-[11px] text-inkSoft/70">{isAdmin ? 'Administrator' : 'Family Member'}</p>
            </div>
            <button onClick={signOut} title="Sign out" className="text-inkSoft transition hover:text-rust">
              <Icon name="x" className="h-4 w-4 rotate-45" />
            </button>
          </div>
        </div>
      </aside>

      {/* ---------- Mobile top bar ---------- */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-line/60 bg-white/80 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-goldDeep text-white">
            <Icon name="tree" className="h-5 w-5" />
          </div>
          <span className="font-display text-base font-bold">{familyName}</span>
        </Link>
        <div className="flex items-center gap-1">
          <NotificationsBell />
          <button onClick={() => setMobileOpen((o) => !o)} className="flex h-10 w-10 items-center justify-center rounded-xl text-inkSoft hover:bg-parchment">
            <Icon name={mobileOpen ? 'x' : 'menu'} />
          </button>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-ink/40 lg:hidden animate-fade-in" onClick={() => setMobileOpen(false)}>
          <div
            className="absolute right-0 top-0 h-full w-72 overflow-y-auto bg-cream p-4 shadow-lift animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between px-2">
              <span className="font-display text-lg font-bold">{session.name || session.email}</span>
              <button onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-inkSoft hover:bg-parchment">
                <Icon name="x" />
              </button>
            </div>
            <nav className="space-y-0.5">
              {items.map((item) => {
                const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition',
                      active ? 'bg-goldDeep text-white' : 'text-inkSoft hover:bg-parchment',
                    )}
                  >
                    <Icon name={item.icon} className="h-[18px] w-[18px]" />
                    {item.label}
                  </Link>
                );
              })}
              <button onClick={signOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-rust hover:bg-rust/10">
                <Icon name="x" className="h-[18px] w-[18px] rotate-45" />
                Sign out
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* ---------- Desktop top bar ---------- */}
      <div className="fixed right-0 top-0 z-30 hidden h-16 w-[calc(100%-15rem)] items-center justify-end gap-2 border-b border-line/60 bg-cream/80 px-6 backdrop-blur lg:flex">
        <NotificationsBell />
        <Link href="/contributions" className="flex h-10 w-10 items-center justify-center rounded-xl text-inkSoft transition hover:bg-parchment hover:text-goldDeep" title="My contributions">
          <Icon name="inbox" />
        </Link>
      </div>

      {/* ---------- Content (rendered once, shared by all breakpoints) ---------- */}
      <div className="lg:pl-60 lg:pt-16">
        <main className="px-4 py-5 pb-24 lg:px-8 lg:py-6 lg:pb-6">{children}</main>
      </div>

      {/* ---------- Mobile bottom nav ---------- */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line/60 bg-white/90 backdrop-blur lg:hidden">
        {items.slice(0, 5).map((item) => {
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition',
                active ? 'text-goldDeep' : 'text-inkSoft',
              )}
            >
              <Icon name={item.icon} className="h-5 w-5" />
              {item.label.split(' ')[0]}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

