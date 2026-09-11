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

// Primary archive destinations.
const PRIMARY_NAV = [
  { href: '/', label: 'Dashboard', icon: 'home' },
  { href: '/tree', label: 'Family Tree', icon: 'tree' },
  { href: '/family', label: 'Family', icon: 'users' },
  { href: '/photos', label: 'Photos', icon: 'photo' },
  { href: '/reunions', label: 'Reunions', icon: 'calendar' },
  { href: '/timeline', label: 'Timeline', icon: 'clock' },
];

// Personal + reference destinations, shown below a divider.
const SECONDARY_NAV = [
  { href: '/profile', label: 'My Profile', icon: 'user' },
  { href: '/contributions', label: 'Contributions', icon: 'inbox' },
  { href: '/notifications', label: 'Notifications', icon: 'bell' },
  { href: '/guide', label: 'Guide', icon: 'book' },
];

// Bottom navigation on phones: Tree | Family | Photos | Reunions | More
const MOBILE_TABS = [
  { href: '/tree', label: 'Tree', icon: 'tree' },
  { href: '/family', label: 'Family', icon: 'users' },
  { href: '/photos', label: 'Photos', icon: 'photo' },
  { href: '/reunions', label: 'Events', icon: 'calendar' },
];

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== '/' && pathname.startsWith(href));
}

function NavLink({
  href,
  label,
  icon,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: string;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
        active
          ? 'bg-primary text-white shadow-[0_10px_24px_-10px_rgba(91,75,219,0.95)]'
          : 'text-white/65 hover:bg-white/[0.08] hover:text-white',
      )}
    >
      <Icon name={icon} className="h-[18px] w-[18px]" />
      {label}
    </Link>
  );
}

export function AppShell({
  session,
  familyName,
  sidebarBackground,
  sidebarOpacity,
  sidebarPosY,
  children,
}: {
  session: Session | null;
  familyName: string;
  sidebarBackground?: string;
  sidebarOpacity?: string;
  sidebarPosY?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = session?.role === 'ADMIN';
  const [moreOpen, setMoreOpen] = useState(false);

  const sidebarImage = sidebarBackground ? `/api/files/${sidebarBackground}` : '';
  const sidebarImageOpacity = Math.min(100, Math.max(10, parseInt(sidebarOpacity || '50', 10))) / 100;
  const sidebarImagePosY = Math.min(100, Math.max(0, parseInt(sidebarPosY || '50', 10)));

  const moreItems = [
    ...PRIMARY_NAV,
    ...SECONDARY_NAV,
    ...(isAdmin ? [{ href: '/admin', label: 'Admin', icon: 'shield' }] : []),
  ];

  async function signOut() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Even if the request never lands, send them to the sign-in screen.
    }
    router.push('/login');
    router.refresh();
  }

  const initial = (session?.name || session?.email || '?').slice(0, 1).toUpperCase();
  const displayName = session?.name || session?.email || 'Guest';

  return (
    <div className="app-backdrop min-h-screen">
      {/* ---------- Desktop sidebar ---------- */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col overflow-hidden bg-navy lg:flex">
        {/* Optional background photo (admin-configurable) */}
        {sidebarImage && (
          <>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-cover"
              style={{
                backgroundImage: `url('${sidebarImage}')`,
                backgroundPositionY: `${sidebarImagePosY}%`,
                opacity: sidebarImageOpacity,
              }}
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-b from-navy/92 via-navy/85 to-navyDeep/90"
            />
          </>
        )}

        <Link
          href="/"
          className="relative flex items-center gap-3 px-5 pb-5 pt-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-white shadow-[0_10px_24px_-10px_rgba(91,75,219,0.95)]">
            <Icon name="tree" className="h-6 w-6" />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate font-display text-lg font-bold tracking-wide text-white">{familyName}</span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
              Family Archive
            </span>
          </span>
        </Link>

        <nav className="relative flex-1 space-y-1 overflow-y-auto px-3 pb-2" aria-label="Main">
          {PRIMARY_NAV.map((item) => (
            <NavLink key={item.href} {...item} active={isActive(pathname, item.href)} />
          ))}

          <div aria-hidden="true" className="!my-3 mx-3 h-px bg-white/10" />

          {SECONDARY_NAV.map((item) => (
            <NavLink key={item.href} {...item} active={isActive(pathname, item.href)} />
          ))}
          {isAdmin && <NavLink href="/admin" label="Admin" icon="shield" active={isActive(pathname, '/admin')} />}
        </nav>

        <div className="relative border-t border-white/10 p-3">
          {session ? (
            <div className="space-y-2">
              <Link
                href="/profile"
                className="flex items-center gap-3 rounded-2xl px-2.5 py-2 transition hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 font-display text-sm font-bold text-white ring-1 ring-white/15">
                  {initial}
                </span>
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate text-sm font-semibold text-white">{displayName}</span>
                  <span className="block truncate text-[11px] text-white/45">
                    {isAdmin ? 'Administrator' : 'Family Member'}
                  </span>
                </span>
              </Link>
              <button
                type="button"
                onClick={signOut}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-white/55 transition hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                <Icon name="logOut" className="h-4 w-4" />
                Sign out
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="px-1 text-xs leading-relaxed text-white/50">
                Viewing as guest — sign in to contribute to the archive.
              </p>
              <Link href="/login" className="btn-primary w-full px-3 text-xs">
                Sign in
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* ---------- Mobile header ---------- */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-2 border-b border-line/70 bg-white/85 px-3 backdrop-blur lg:hidden">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
            <Icon name="tree" className="h-4.5 w-4.5" />
          </span>
          <span className="truncate font-display text-[15px] font-bold">{familyName}</span>
        </Link>
        <div className="flex shrink-0 items-center gap-0.5">
          <Link
            href="/family"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-subtext transition hover:bg-appBg hover:text-primary"
            aria-label="Search family"
          >
            <Icon name="search" />
          </Link>
          {session ? (
            <>
              <NotificationsBell />
              <Link
                href="/profile"
                className="ml-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 font-display text-sm font-bold text-primary"
                aria-label="My profile"
              >
                {initial}
              </Link>
            </>
          ) : (
            <Link href="/login" className="btn-primary ml-1 px-3.5 py-2 text-xs">
              Sign in
            </Link>
          )}
        </div>
      </header>

      {/* ---------- Desktop top bar ---------- */}
      <div className="fixed right-0 top-0 z-30 hidden h-16 w-[calc(100%-15rem)] items-center justify-between gap-4 border-b border-line/70 bg-white/85 px-6 backdrop-blur lg:flex">
        <div className="relative max-w-xl flex-1">
          <Icon name="search" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtext" />
          <input
            type="search"
            placeholder="Search family members, photos, albums…"
            aria-label="Search the archive"
            className="w-full rounded-full border border-line bg-appBg/80 py-2.5 pl-10 pr-16 text-sm text-ink outline-none transition placeholder:text-subtext/70 focus:border-primary/50 focus:bg-white focus:ring-2 focus:ring-primary/20"
          />
          <kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-line bg-white px-2 py-0.5 text-[10px] font-semibold text-subtext/70 xl:block">
            Ctrl K
          </kbd>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {session ? (
            <>
              {isAdmin && (
                <Link
                  href="/admin/settings"
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-subtext transition hover:bg-appBg hover:text-primary"
                  aria-label="Archive settings"
                  title="Archive settings"
                >
                  <Icon name="settings" className="h-5 w-5" />
                </Link>
              )}
              <NotificationsBell />
              <Link
                href="/profile"
                className="ml-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 font-display text-sm font-bold text-primary"
                aria-label="My profile"
              >
                {initial}
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/register" className="btn-ghost px-3 text-xs">
                Request access
              </Link>
              <Link href="/login" className="btn-primary px-4 text-xs">
                Sign in
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ---------- Content ---------- */}
      <div className="lg:pl-60 lg:pt-16">
        <main className="mx-auto w-full max-w-[1600px] px-4 pb-24 pt-4 sm:px-6 lg:px-8 lg:pb-8 lg:pt-6">
          {children}
        </main>
      </div>

      {/* ---------- Mobile bottom nav ---------- */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line/70 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        aria-label="Primary"
      >
        {MOBILE_TABS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition',
                active ? 'text-primary' : 'text-subtext',
              )}
            >
              <span className={cn('flex h-7 w-12 items-center justify-center rounded-full transition', active && 'bg-primary/10')}>
                <Icon name={item.icon} className="h-5 w-5" />
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-label="More navigation"
          aria-expanded={moreOpen}
          className={cn(
            'flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition',
            moreItems.some((m) => isActive(pathname, m.href)) ? 'text-primary' : 'text-subtext',
          )}
        >
          <span className="flex h-7 w-12 items-center justify-center rounded-full">
            <Icon name="menu" className="h-5 w-5" />
          </span>
          <span className="truncate">More</span>
        </button>
      </nav>

      {/* ---------- More sheet ---------- */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 bg-navyDeep/50 animate-fade-in lg:hidden" onClick={() => setMoreOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="More navigation"
            className="absolute inset-x-0 bottom-0 max-h-[80dvh] overflow-y-auto rounded-t-3xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-float animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
            <div className="mb-3 flex items-center justify-between px-1">
              <span className="font-display text-base font-bold">{displayName}</span>
              <button
                onClick={() => setMoreOpen(false)}
                aria-label="Close menu"
                className="rounded-xl p-2 text-subtext transition hover:bg-appBg"
              >
                <Icon name="x" />
              </button>
            </div>
            <nav className="grid grid-cols-2 gap-2" aria-label="More">
              {moreItems.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      'flex min-w-0 items-center gap-3 rounded-xl px-3.5 py-3.5 text-sm font-semibold transition',
                      active ? 'bg-primary text-white' : 'bg-appBg text-ink hover:text-primary',
                    )}
                  >
                    <Icon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
              {session ? (
                <button
                  type="button"
                  onClick={signOut}
                  className="flex min-w-0 items-center gap-3 rounded-xl bg-accentCoralSoft px-3.5 py-3.5 text-sm font-semibold text-accentCoral transition hover:bg-accentCoralSoft/70"
                >
                  <Icon name="logOut" className="h-[18px] w-[18px] shrink-0" />
                  <span className="truncate">Sign out</span>
                </button>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMoreOpen(false)}
                  className="flex min-w-0 items-center gap-3 rounded-xl bg-primary px-3.5 py-3.5 text-sm font-semibold text-white"
                >
                  <Icon name="user" className="h-[18px] w-[18px] shrink-0" />
                  <span className="truncate">Sign in</span>
                </Link>
              )}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
