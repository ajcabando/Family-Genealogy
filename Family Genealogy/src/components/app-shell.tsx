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
  { href: '/notifications', label: 'Notifications', icon: 'bell' },
  { href: '/guide', label: 'Guide', icon: 'book' },
];

// Bottom navigation on phones: Tree | Family | Photos | Reunions | More
const MOBILE_TABS = [
  { href: '/tree', label: 'Tree', icon: 'tree' },
  { href: '/family', label: 'Family', icon: 'users' },
  { href: '/photos', label: 'Photos', icon: 'photo' },
  { href: '/reunions', label: 'Reunions', icon: 'calendar' },
];

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== '/' && pathname.startsWith(href));
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
    { href: '/', label: 'Dashboard', icon: 'home' },
    { href: '/timeline', label: 'Timeline', icon: 'clock' },
    { href: '/profile', label: 'My Profile', icon: 'user' },
    { href: '/contributions', label: 'Contributions', icon: 'inbox' },
    { href: '/notifications', label: 'Notifications', icon: 'bell' },
    { href: '/guide', label: 'Guide', icon: 'book' },
    ...(isAdmin ? [{ href: '/admin', label: 'Admin', icon: 'shield' as string }] : []),
  ];

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  const initial = (session?.name || session?.email || '?').slice(0, 1).toUpperCase();
  const displayName = session?.name || session?.email || 'Guest';

  return (
    <div className="min-h-screen">
      {/* ---------- Desktop sidebar ---------- */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col overflow-hidden bg-heritageNavy lg:flex">
        {/* Heritage depth wash — deepest at the base, where the roots are */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-heritageNavy via-heritageNavy to-heritageDepth"
        />

        {/* Family-tree silhouette anchored to the bottom of the sidebar */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[58%] bg-no-repeat"
          style={{ backgroundImage: "url('/tree-of-life-dark.svg')", backgroundSize: '300px', backgroundPosition: 'center bottom', opacity: 0.08 }}
        />

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
              className="pointer-events-none absolute inset-0 bg-gradient-to-b from-heritageNavy/90 via-heritageNavy/75 to-heritageDepth/70"
            />
          </>
        )}
        <Link href="/" className="relative flex items-center gap-3 px-5 py-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-heritageAccent text-white ring-2 ring-white/10 shadow-[0_8px_20px_-8px_rgba(91,75,219,0.9)]">
            <Icon name="tree" className="h-7 w-7" />
          </div>
          <div className="leading-tight">
            <p className="font-display text-xl font-bold text-white">{familyName}</p>
            <p className="text-[11px] uppercase tracking-widest text-white/60">Family Archive</p>
          </div>
        </Link>
        <nav className="relative flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
                  active
                    ? 'bg-heritageAccent text-white shadow-[0_8px_20px_-10px_rgba(91,75,219,0.95)]'
                    : 'text-white/70 hover:bg-heritageDepth hover:text-white',
                )}
              >
                <Icon name={item.icon} className="h-[18px] w-[18px]" />
                {item.label}
                {item.href === '/notifications' && session && (
                  <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-heritageGold text-[10px] font-bold text-heritageNavy">
                    3
                  </span>
                )}
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              href="/admin"
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
                isActive(pathname, '/admin')
                  ? 'bg-heritageAccent text-white shadow-[0_8px_20px_-10px_rgba(91,75,219,0.95)]'
                  : 'text-white/70 hover:bg-heritageDepth hover:text-white',
              )}
            >
              <Icon name="shield" className="h-[18px] w-[18px]" />
              Admin
            </Link>
          )}
        </nav>
        <div className="relative border-t border-white/10 p-4">
          {session ? (
            <div className="space-y-3">
              <p className="px-2 font-display text-[13px] italic leading-relaxed text-white/50">
                &ldquo;Our Family<br />Our Roots<br />Our Tomorrow&rdquo;
              </p>
              <div aria-hidden="true" className="mx-2 h-px bg-gradient-to-r from-transparent via-heritageGold/40 to-transparent" />
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white font-display text-sm font-bold text-ink">
                  {initial}
                </div>
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                  <p className="text-[11px] text-white/60">{isAdmin ? 'Administrator' : 'Family Member'}</p>
                </div>
                <Icon name="chevronRight" className="h-4 w-4 shrink-0 text-white/40" />
              </div>
              <button 
                onClick={signOut} 
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-white/70 transition hover:bg-heritageDepth hover:text-white"
              >
                <Icon name="logOut" className="h-4 w-4" />
                Sign out
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-white/60">Viewing as guest — sign in to contribute to the archive.</p>
              <div className="flex gap-2">
                <Link href="/login" className="btn-gold flex-1 px-3 text-xs">Sign in</Link>
                <Link href="/register" className="btn-ghost flex-1 px-3 text-xs border-white/20 text-white hover:bg-white/10">Request access</Link>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ---------- Compact mobile header ---------- */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line/60 bg-white/80 px-3 backdrop-blur lg:hidden">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-goldDeep text-white">
            <Icon name="tree" className="h-5 w-5" />
          </div>
          <span className="truncate font-display text-[15px] font-bold">{familyName}</span>
        </Link>
        <div className="flex shrink-0 items-center gap-0.5">
          <Link
            href="/family"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-inkSoft transition hover:bg-parchment hover:text-goldDeep"
            aria-label="Search family"
          >
            <Icon name="search" />
          </Link>
          {session ? (
            <>
              <NotificationsBell />
              <Link
                href="/profile"
                className="ml-0.5 flex h-9 w-9 items-center justify-center rounded-full border border-line bg-gold/15 font-display text-sm font-bold text-goldDeep"
                aria-label="My profile"
              >
                {initial}
              </Link>
            </>
          ) : (
            <Link href="/login" className="btn-gold ml-1 px-3.5 py-2 text-xs">
              Sign in
            </Link>
          )}
        </div>
      </header>

      {/* ---------- Desktop top bar ---------- */}
      <div className="fixed right-0 top-0 z-30 hidden h-16 w-[calc(100%-16rem)] items-center justify-between border-b border-line/60 bg-white/80 px-6 backdrop-blur lg:flex">
        {/* Search bar */}
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Icon name="search" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-inkSoft/60" />
            <input
              type="text"
              placeholder="Search family members, photos, events..."
              className="w-full rounded-xl border border-line bg-parchment/50 py-2.5 pl-10 pr-16 text-sm text-ink placeholder:text-inkSoft/60 outline-none transition focus:border-navyAccent focus:bg-white focus:ring-2 focus:ring-navyAccent/20"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-line bg-white px-2 py-0.5 text-[10px] font-semibold text-inkSoft/60">
              Ctrl K
            </kbd>
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2 ml-4">
          {session ? (
            <>
              <button
                className="flex h-10 w-10 items-center justify-center rounded-xl text-inkSoft transition hover:bg-parchment hover:text-navyAccent"
                title="Toggle theme"
              >
                <Icon name="sun" className="h-5 w-5" />
              </button>
              <NotificationsBell />
              <Link 
                href="/profile"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-navy font-display text-sm font-bold text-white ml-2"
                aria-label="My profile"
              >
                {initial}
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/register" className="btn-ghost px-3 text-xs">Request access</Link>
              <Link href="/login" className="btn-gold px-4 text-xs">Sign in</Link>
            </div>
          )}
        </div>
      </div>

      {/* ---------- Content (rendered once, shared by all breakpoints) ---------- */}
      <div className="lg:pl-64 lg:pt-16">
        <main className="px-4 pb-24 pt-4 sm:px-6 lg:px-8 lg:pb-6 lg:pt-6">{children}</main>
      </div>

      {/* ---------- Mobile bottom nav: Tree | Family | Photos | Reunions | More ---------- */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line/60 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        aria-label="Primary"
      >
        {MOBILE_TABS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition',
                active ? 'text-goldDeep' : 'text-inkSoft',
              )}
            >
              <span className={cn('flex h-7 w-12 items-center justify-center rounded-full', active && 'bg-gold/15')}>
                <Icon name={item.icon} className="h-5 w-5" />
              </span>
              {item.label}
            </Link>
          );
        })}
        <button
          onClick={() => setMoreOpen(true)}
          className={cn(
            'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition',
            moreItems.some((m) => isActive(pathname, m.href)) ? 'text-goldDeep' : 'text-inkSoft',
          )}
        >
          <span className="flex h-7 w-12 items-center justify-center rounded-full">
            <Icon name="menu" className="h-5 w-5" />
          </span>
          More
        </button>
      </nav>

      {/* ---------- More bottom sheet ---------- */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 bg-ink/40 animate-fade-in lg:hidden" onClick={() => setMoreOpen(false)}>
          <div
            className="absolute inset-x-0 bottom-0 max-h-[80dvh] overflow-y-auto rounded-t-3xl bg-cream p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-lift animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
            <div className="mb-3 flex items-center justify-between px-1">
              <span className="font-display text-base font-bold">{displayName}</span>
              <button onClick={() => setMoreOpen(false)} className="rounded-lg p-2 text-inkSoft hover:bg-parchment" aria-label="Close menu">
                <Icon name="x" />
              </button>
            </div>
            <nav className="grid grid-cols-2 gap-2">
              {moreItems.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3.5 py-3.5 text-sm font-semibold transition',
                      active ? 'bg-goldDeep text-white' : 'bg-white text-inkSoft shadow-card hover:text-goldDeep',
                    )}
                  >
                    <Icon name={item.icon} className="h-[18px] w-[18px]" />
                    {item.label}
                  </Link>
                );
              })}
              {session ? (
                <button
                  onClick={signOut}
                  className="flex items-center gap-3 rounded-xl bg-rust/10 px-3.5 py-3.5 text-sm font-semibold text-rust transition hover:bg-rust/20"
                >
                  <Icon name="x" className="h-[18px] w-[18px] rotate-45" />
                  Sign out
                </button>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 rounded-xl bg-goldDeep px-3.5 py-3.5 text-sm font-semibold text-white shadow-card"
                >
                  <Icon name="user" className="h-[18px] w-[18px]" />
                  Sign in
                </Link>
              )}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}